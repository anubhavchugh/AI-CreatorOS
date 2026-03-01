/**
 * AI CreatorOS — Pricing Plans
 * Centralized product/price definitions for Razorpay integration
 * Amounts are in paise (INR subunits). 100 paise = ₹1
 */

export const PLANS = {
  free: {
    name: "Free",
    description: "Get started with AI content creation",
    price: 0,
    priceDisplay: "₹0",
    currency: "INR",
    features: [
      "1 AI Character",
      "10 content pieces/month",
      "Basic analytics",
      "Community support",
      "Watermarked exports",
    ],
    limits: {
      characters: 1,
      contentPerMonth: 10,
      platforms: 1,
    },
  },
  pro: {
    name: "Pro",
    description: "Scale your AI content empire",
    price: 249900, // ₹2,499/month in paise
    priceDisplay: "₹2,499",
    currency: "INR",
    interval: "monthly" as const,
    period: 1,
    features: [
      "10 AI Characters",
      "Unlimited content",
      "Advanced analytics",
      "Priority support",
      "No watermarks",
      "Multi-platform distribution",
      "Fan membership tools",
      "Brand deal marketplace",
    ],
    limits: {
      characters: 10,
      contentPerMonth: -1, // unlimited
      platforms: 5,
    },
  },
  enterprise: {
    name: "Enterprise",
    description: "For agencies and studios",
    price: 799900, // ₹7,999/month in paise
    priceDisplay: "₹7,999",
    currency: "INR",
    interval: "monthly" as const,
    period: 1,
    features: [
      "Unlimited AI Characters",
      "Unlimited content",
      "White-label exports",
      "Dedicated support",
      "Custom AI model training",
      "API access",
      "Team collaboration",
      "IP licensing tools",
      "Revenue analytics suite",
    ],
    limits: {
      characters: -1, // unlimited
      contentPerMonth: -1,
      platforms: -1,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanByKey(key: string): (typeof PLANS)[PlanKey] | undefined {
  return PLANS[key as PlanKey];
}
