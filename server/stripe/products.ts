/**
 * AI CreatorOS — Pricing Plans
 * Centralized product/price definitions for Stripe integration
 */

export const PLANS = {
  free: {
    name: "Free",
    description: "Get started with AI content creation",
    price: 0,
    priceId: null, // No Stripe price for free tier
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
    price: 2900, // $29/month in cents
    priceDisplay: "$29",
    interval: "month" as const,
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
    price: 9900, // $99/month in cents
    priceDisplay: "$99",
    interval: "month" as const,
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
