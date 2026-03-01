/**
 * Razorpay integration — order creation, payment verification, and webhook handling
 */
import Razorpay from "razorpay";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { getDb } from "../db";
import { users, payments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { PLANS, type PlanKey } from "./products";

let _razorpay: InstanceType<typeof Razorpay> | null = null;

function getRazorpay(): InstanceType<typeof Razorpay> {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

/**
 * Create a Razorpay order for a subscription plan (one-time payment model)
 */
export async function createRazorpayOrder(
  userId: number,
  userEmail: string,
  userName: string | null,
  planKey: PlanKey
): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
  const razorpay = getRazorpay();
  const plan = PLANS[planKey];

  if (!plan || plan.price === 0) {
    throw new Error("Cannot create order for free plan");
  }

  const order = await razorpay.orders.create({
    amount: plan.price,
    currency: plan.currency,
    receipt: `user_${userId}_${planKey}_${Date.now()}`,
    notes: {
      user_id: userId.toString(),
      user_email: userEmail,
      user_name: userName || "",
      plan: planKey,
    },
  });

  return {
    orderId: order.id,
    amount: plan.price,
    currency: plan.currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

/**
 * Verify Razorpay payment signature after checkout
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET not configured");

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Handle payment verification callback from frontend
 */
export async function handlePaymentVerification(
  userId: number,
  orderId: string,
  paymentId: string,
  signature: string,
  planKey: PlanKey
): Promise<{ success: boolean }> {
  const isValid = verifyPaymentSignature(orderId, paymentId, signature);

  if (!isValid) {
    throw new Error("Payment signature verification failed");
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const plan = PLANS[planKey];

  // Update user's plan
  await db.update(users).set({
    plan: planKey as any,
    razorpayCustomerId: paymentId, // store latest payment reference
  }).where(eq(users.id, userId));

  // Record payment
  await db.insert(payments).values({
    userId,
    razorpayPaymentId: paymentId,
    razorpayOrderId: orderId,
    amount: plan.price,
    currency: plan.currency,
    plan: planKey as any,
    status: "succeeded",
  });

  console.log(`[Razorpay] User ${userId} upgraded to ${planKey} via payment ${paymentId}`);

  return { success: true };
}

/**
 * Register the Razorpay webhook endpoint
 */
export function registerRazorpayWebhook(app: Express) {
  app.post(
    "/api/razorpay/webhook",
    (req: Request, res: Response) => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      // Verify webhook signature
      const signature = req.headers["x-razorpay-signature"] as string;
      if (!signature) {
        console.error("[Razorpay Webhook] Missing signature header");
        return res.status(400).json({ error: "Missing signature" });
      }

      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.error("[Razorpay Webhook] Signature verification failed");
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Handle test events
      if (event.event === "test" || (event.payload?.payment?.entity?.id || "").startsWith("pay_test_")) {
        console.log("[Razorpay Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      // Process the event
      handleRazorpayEvent(event)
        .then(() => res.json({ received: true }))
        .catch((err) => {
          console.error("[Razorpay Webhook] Error processing event:", err);
          res.status(500).json({ error: "Webhook processing failed" });
        });
    }
  );
}

async function handleRazorpayEvent(event: any) {
  const db = await getDb();
  if (!db) {
    console.warn("[Razorpay Webhook] Database not available");
    return;
  }

  switch (event.event) {
    case "payment.captured": {
      const payment = event.payload?.payment?.entity;
      if (!payment) break;

      const userId = parseInt(payment.notes?.user_id || "0");
      const planKey = (payment.notes?.plan || "pro") as PlanKey;

      if (userId > 0) {
        // Check if payment already recorded (idempotency)
        const existing = await db.select().from(payments)
          .where(eq(payments.razorpayPaymentId, payment.id))
          .limit(1);

        if (existing.length === 0) {
          await db.update(users).set({
            plan: planKey as any,
            razorpayCustomerId: payment.id,
          }).where(eq(users.id, userId));

          await db.insert(payments).values({
            userId,
            razorpayPaymentId: payment.id,
            razorpayOrderId: payment.order_id || null,
            amount: payment.amount || 0,
            currency: (payment.currency || "INR").toUpperCase(),
            plan: planKey as any,
            status: "succeeded",
          });

          console.log(`[Razorpay] Payment captured for user ${userId}, plan: ${planKey}`);
        }
      }
      break;
    }

    case "payment.failed": {
      const payment = event.payload?.payment?.entity;
      if (!payment) break;

      const userId = parseInt(payment.notes?.user_id || "0");
      const planKey = (payment.notes?.plan || "pro") as PlanKey;

      if (userId > 0) {
        await db.insert(payments).values({
          userId,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id || null,
          amount: payment.amount || 0,
          currency: (payment.currency || "INR").toUpperCase(),
          plan: planKey as any,
          status: "failed",
        });

        console.log(`[Razorpay] Payment failed for user ${userId}`);
      }
      break;
    }

    case "subscription.activated": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription) break;

      const userId = parseInt(subscription.notes?.user_id || "0");
      const planKey = (subscription.notes?.plan || "pro") as PlanKey;

      if (userId > 0) {
        await db.update(users).set({
          plan: planKey as any,
          razorpaySubscriptionId: subscription.id,
        }).where(eq(users.id, userId));

        console.log(`[Razorpay] Subscription activated for user ${userId}, plan: ${planKey}`);
      }
      break;
    }

    case "subscription.cancelled":
    case "subscription.completed": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription) break;

      const [user] = await db.select().from(users)
        .where(eq(users.razorpaySubscriptionId, subscription.id))
        .limit(1);

      if (user) {
        await db.update(users).set({
          plan: "free",
          razorpaySubscriptionId: null,
        }).where(eq(users.id, user.id));

        console.log(`[Razorpay] Subscription ended for user ${user.id}, downgraded to free`);
      }
      break;
    }

    case "refund.processed": {
      const refund = event.payload?.refund?.entity;
      if (!refund) break;

      const paymentId = refund.payment_id;
      if (paymentId) {
        await db.update(payments).set({
          status: "refunded",
        }).where(eq(payments.razorpayPaymentId, paymentId));

        console.log(`[Razorpay] Refund processed for payment ${paymentId}`);
      }
      break;
    }

    default:
      console.log(`[Razorpay Webhook] Unhandled event type: ${event.event}`);
  }
}
