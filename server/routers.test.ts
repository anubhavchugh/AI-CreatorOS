import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { PLANS } from "./razorpay/products";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the db module
vi.mock("./db", () => ({
  addToWaitlist: vi.fn().mockResolvedValue(undefined),
  getWaitlistEntries: vi.fn().mockResolvedValue([
    { id: 1, email: "test@example.com", name: "Test", status: "pending", source: "landing", createdAt: new Date() },
  ]),
  getWaitlistStats: vi.fn().mockResolvedValue({ total: 10, pending: 5, invited: 3, joined: 2 }),
  updateWaitlistStatus: vi.fn().mockResolvedValue(undefined),
  createCharacter: vi.fn().mockResolvedValue(1),
  getUserCharacters: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Nova", niche: "tech", status: "active", platforms: ["youtube"] },
  ]),
  getCharacterById: vi.fn().mockResolvedValue({
    id: 1, userId: 1, name: "Nova", niche: "tech", status: "active", platforms: ["youtube"],
  }),
  updateCharacter: vi.fn().mockResolvedValue(undefined),
  deleteCharacter: vi.fn().mockResolvedValue(undefined),
  createContentItem: vi.fn().mockResolvedValue(1),
  getUserContentItems: vi.fn().mockResolvedValue([]),
  getCharacterContentItems: vi.fn().mockResolvedValue([]),
  updateContentItem: vi.fn().mockResolvedValue(undefined),
  getUserApiKeys: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, service: "openai", apiKey: "sk-test1234567890abcdef", model: "gpt-4o", isActive: true },
  ]),
  upsertApiKey: vi.fn().mockResolvedValue(undefined),
  deleteApiKey: vi.fn().mockResolvedValue(undefined),
  getUserPlatformConnections: vi.fn().mockResolvedValue([]),
  upsertPlatformConnection: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([
    { id: 1, name: "Admin", email: "admin@test.com", role: "admin", plan: "free" },
  ]),
  getUserStats: vi.fn().mockResolvedValue({ total: 1, pro: 0, enterprise: 0 }),
  getRevenueStats: vi.fn().mockResolvedValue({ totalRevenue: 0, monthlyRevenue: 0, totalPayments: 0 }),
  getRecentPayments: vi.fn().mockResolvedValue([]),
}));

// Mock razorpay
vi.mock("./razorpay/razorpay", () => ({
  createRazorpayOrder: vi.fn().mockResolvedValue({
    orderId: "order_test_123",
    amount: 249900,
    currency: "INR",
    keyId: "rzp_test_key",
  }),
  handlePaymentVerification: vi.fn().mockResolvedValue({ success: true }),
}));

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "clerk",
    role: "user",
    plan: "free",
    razorpayCustomerId: null,
    razorpaySubscriptionId: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({ role: "admin" });
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ==================== AUTH ====================
describe("auth.me", () => {
  it("returns the authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.email).toBe("test@example.com");
    expect(result?.name).toBe("Test User");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ==================== WAITLIST ====================
describe("waitlist.join", () => {
  it("adds an email to the waitlist", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.waitlist.join({
      email: "newuser@example.com",
      name: "New User",
      source: "landing",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.waitlist.join({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

// ==================== CHARACTERS ====================
describe("characters", () => {
  it("lists user characters", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.characters.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.name).toBe("Nova");
  });

  it("creates a character", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.characters.create({
      name: "Kai",
      niche: "gaming",
      personality: "Energetic and funny",
      visualStyle: "anime",
      platforms: ["tiktok", "youtube"],
    });
    expect(result).toEqual({ id: 1 });
  });

  it("requires a name to create a character", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.characters.create({ name: "" })
    ).rejects.toThrow();
  });

  it("gets a character by id", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.characters.get({ id: 1 });
    expect(result.name).toBe("Nova");
  });

  it("updates a character", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.characters.update({
      id: 1,
      name: "Nova Updated",
      status: "paused",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes a character", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.characters.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ==================== CONTENT ====================
describe("content", () => {
  it("lists user content items", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.content.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a content item", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.content.create({
      characterId: 1,
      title: "Tech Review: iPhone 18",
      type: "short",
      platform: "youtube",
    });
    expect(result).toEqual({ id: 1 });
  });

  it("requires a title to create content", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.content.create({ characterId: 1, title: "" })
    ).rejects.toThrow();
  });
});

// ==================== SETTINGS ====================
describe("settings", () => {
  it("gets masked API keys", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.getApiKeys();
    expect(Array.isArray(result)).toBe(true);
    // API key should be masked — only last 4 chars visible
    expect(result[0]?.apiKey).toContain("••••••••••••••••••••");
    expect(result[0]?.apiKey.slice(-4)).toBe("cdef");
  });

  it("saves an API key", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.saveApiKey({
      service: "openai",
      apiKey: "sk-newkey123",
      model: "gpt-4o",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes an API key", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.deleteApiKey({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("gets platform connections", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.getPlatformConnections();
    expect(Array.isArray(result)).toBe(true);
  });

  it("saves a platform connection", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.settings.savePlatformConnection({
      platform: "youtube",
      apiKey: "yt-key-123",
      channelId: "UC123",
      channelName: "My Channel",
    });
    expect(result).toEqual({ success: true });
  });
});

// ==================== BILLING (RAZORPAY) ====================
describe("billing", () => {
  it("returns all plans", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.getPlans();
    expect(result.length).toBe(3);
    const planKeys = result.map((p) => p.key);
    expect(planKeys).toContain("free");
    expect(planKeys).toContain("pro");
    expect(planKeys).toContain("enterprise");
  });

  it("returns correct plan pricing in INR paise", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.getPlans();
    const pro = result.find((p) => p.key === "pro");
    expect(pro?.price).toBe(249900); // ₹2,499 in paise
    const enterprise = result.find((p) => p.key === "enterprise");
    expect(enterprise?.price).toBe(799900); // ₹7,999 in paise
  });

  it("creates a Razorpay order for pro plan", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.createOrder({ plan: "pro" });
    expect(result.orderId).toBe("order_test_123");
    expect(result.amount).toBe(249900);
    expect(result.currency).toBe("INR");
    expect(result.keyId).toBe("rzp_test_key");
  });

  it("verifies a Razorpay payment", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.verifyPayment({
      orderId: "order_test_123",
      paymentId: "pay_test_456",
      signature: "test_signature",
      plan: "pro",
    });
    expect(result).toEqual({ success: true });
  });

  it("returns current plan for user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.currentPlan();
    expect(result.plan).toBe("free");
    expect(result.features).toEqual(PLANS.free.features);
  });
});

// ==================== ADMIN ====================
describe("admin", () => {
  it("allows admin to view waitlist", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.waitlist();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to view waitlist stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.waitlistStats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("pending");
  });

  it("allows admin to update waitlist status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.updateWaitlistStatus({
      id: 1,
      status: "invited",
    });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to view all users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to view user stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.userStats();
    expect(result).toHaveProperty("total");
  });

  it("allows admin to view revenue stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.revenueStats();
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("monthlyRevenue");
  });

  it("blocks non-admin from admin endpoints", async () => {
    const ctx = createUserContext(); // regular user, not admin
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.waitlist()).rejects.toThrow();
    await expect(caller.admin.users()).rejects.toThrow();
    await expect(caller.admin.revenueStats()).rejects.toThrow();
  });
});

// ==================== PRODUCTS ====================
describe("products", () => {
  it("has correct plan structure", () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.pro.price).toBe(249900); // ₹2,499 in paise
    expect(PLANS.enterprise.price).toBe(799900); // ₹7,999 in paise
  });

  it("has features for all plans", () => {
    expect(PLANS.free.features.length).toBeGreaterThan(0);
    expect(PLANS.pro.features.length).toBeGreaterThan(0);
    expect(PLANS.enterprise.features.length).toBeGreaterThan(0);
  });

  it("has limits for all plans", () => {
    expect(PLANS.free.limits.characters).toBe(1);
    expect(PLANS.pro.limits.characters).toBe(10);
    expect(PLANS.enterprise.limits.characters).toBe(-1); // unlimited
  });
});
