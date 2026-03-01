/**
 * Stripe integration — checkout sessions and webhook handling
 */
import Stripe from "stripe";
import type { Express, Request, Response } from "express";
import { getDb } from "../db";
import { users, payments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { PLANS, type PlanKey } from "./products";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as any });
  }
  return _stripe;
}

/**
 * Create a Stripe Checkout session for a subscription plan
 */
export async function createCheckoutSession(
  userId: number,
  userEmail: string,
  userName: string | null,
  planKey: PlanKey,
  origin: string
): Promise<string> {
  const stripe = getStripe();
  const plan = PLANS[planKey];

  if (!plan || plan.price === 0) {
    throw new Error("Cannot create checkout for free plan");
  }

  // Find or create Stripe customer
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  let customerId = user?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: userName || undefined,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId.toString(),
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `AI CreatorOS ${plan.name}`,
            description: plan.description,
          },
          unit_amount: plan.price,
          recurring: { interval: plan.interval },
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      customer_name: userName || "",
      plan: planKey,
    },
    success_url: `${origin}/dashboard?payment=success&plan=${planKey}`,
    cancel_url: `${origin}/dashboard?payment=cancelled`,
  });

  return session.url!;
}

/**
 * Register the Stripe webhook endpoint
 * MUST be called BEFORE express.json() middleware
 */
export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    // Raw body needed for signature verification
    (req: Request, res: Response) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      // Process the event
      handleStripeEvent(event)
        .then(() => res.json({ received: true }))
        .catch((err) => {
          console.error("[Stripe Webhook] Error processing event:", err);
          res.status(500).json({ error: "Webhook processing failed" });
        });
    }
  );
}

async function handleStripeEvent(event: Stripe.Event) {
  const db = await getDb();
  if (!db) {
    console.warn("[Stripe Webhook] Database not available");
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.user_id || session.client_reference_id || "0");
      const planKey = (session.metadata?.plan || "pro") as PlanKey;

      if (userId > 0) {
        // Update user's plan and subscription ID
        await db.update(users).set({
          plan: planKey as any,
          stripeSubscriptionId: session.subscription as string,
          stripeCustomerId: session.customer as string,
        }).where(eq(users.id, userId));

        // Record payment
        await db.insert(payments).values({
          userId,
          stripePaymentId: session.payment_intent as string,
          amount: session.amount_total || 0,
          currency: session.currency || "usd",
          plan: planKey as any,
          status: "succeeded",
        });

        console.log(`[Stripe] User ${userId} upgraded to ${planKey}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
      if (user) {
        if (subscription.status === "active") {
          await db.update(users).set({
            stripeSubscriptionId: subscription.id,
          }).where(eq(users.id, user.id));
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
      if (user) {
        await db.update(users).set({
          plan: "free",
          stripeSubscriptionId: null,
        }).where(eq(users.id, user.id));
        console.log(`[Stripe] User ${user.id} downgraded to free`);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
      if (user) {
        await db.insert(payments).values({
          userId: user.id,
          stripePaymentId: (invoice as any).payment_intent as string || invoice.id,
          amount: invoice.amount_paid || 0,
          currency: invoice.currency || "usd",
          plan: user.plan as any,
          status: "succeeded",
        });
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}
