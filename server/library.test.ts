import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-" + userId,
    email: "test@example.com",
    name: "Test User",
    loginMethod: "clerk",
    role: "user",
    plan: "free",
    razorpayCustomerId: null,
    razorpaySubscriptionId: null,
    passwordHash: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
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

function createUnauthContext(): TrpcContext {
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

// Mock the db module
vi.mock("./db", () => ({
  getUserContentWithCharacters: vi.fn().mockResolvedValue([
    {
      id: 1,
      characterId: 1,
      userId: 1,
      title: "Test Video Script",
      type: "short",
      platform: "youtube",
      status: "review",
      script: "Hello world script",
      mediaUrl: "https://cdn.example.com/audio.mp3",
      thumbnailUrl: "https://cdn.example.com/thumb.png",
      description: "A test video",
      tags: ["ai", "test"],
      publishedUrl: null,
      publishError: null,
      scheduledAt: null,
      publishedAt: null,
      views: 0,
      likes: 0,
      comments: 0,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      characterName: "TestBot",
      characterAvatarUrl: null,
    },
    {
      id: 2,
      characterId: 1,
      userId: 1,
      title: "Published TikTok",
      type: "reel",
      platform: "tiktok",
      status: "published",
      script: "TikTok script",
      mediaUrl: "https://cdn.example.com/video.mp4",
      thumbnailUrl: null,
      description: null,
      tags: null,
      publishedUrl: "https://tiktok.com/@test/video/123",
      publishError: null,
      scheduledAt: null,
      publishedAt: new Date("2026-01-02"),
      views: 1500,
      likes: 200,
      comments: 30,
      createdAt: new Date("2026-01-02"),
      updatedAt: new Date("2026-01-02"),
      characterName: "TestBot",
      characterAvatarUrl: null,
    },
  ]),
  getContentItemById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) {
      return {
        id: 1,
        characterId: 1,
        userId: 1,
        title: "Test Video Script",
        type: "short",
        platform: "youtube",
        status: "review",
        script: "Hello world script",
        mediaUrl: "https://cdn.example.com/audio.mp3",
        thumbnailUrl: "https://cdn.example.com/thumb.png",
      };
    }
    if (id === 999) {
      return {
        id: 999,
        characterId: 1,
        userId: 99, // different user
        title: "Other User Content",
        type: "short",
        platform: "youtube",
        status: "review",
        script: "Other script",
        mediaUrl: null,
        thumbnailUrl: null,
      };
    }
    return undefined;
  }),
  deleteContentItem: vi.fn().mockResolvedValue(undefined),
  updateContentItem: vi.fn().mockResolvedValue(undefined),
  getPlatformConnectionForUser: vi.fn().mockResolvedValue(null),
  // Other db functions needed by the router
  addToWaitlist: vi.fn(),
  getWaitlistEntries: vi.fn(),
  getWaitlistStats: vi.fn(),
  updateWaitlistStatus: vi.fn(),
  createCharacter: vi.fn(),
  getUserCharacters: vi.fn().mockResolvedValue([]),
  getCharacterById: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  createContentItem: vi.fn(),
  getUserContentItems: vi.fn().mockResolvedValue([]),
  getCharacterContentItems: vi.fn().mockResolvedValue([]),
  getUserApiKeys: vi.fn().mockResolvedValue([]),
  upsertApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
  getUserPlatformConnections: vi.fn().mockResolvedValue([]),
  upsertPlatformConnection: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserStats: vi.fn().mockResolvedValue({ totalUsers: 0, newUsersToday: 0 }),
  getRevenueStats: vi.fn().mockResolvedValue({ totalRevenue: 0, monthlyRevenue: 0 }),
  getRecentPayments: vi.fn().mockResolvedValue([]),
}));

// Mock razorpay module
vi.mock("./razorpay/razorpay", () => ({
  createRazorpayOrder: vi.fn(),
  handlePaymentVerification: vi.fn(),
}));

// Mock pipeline module
vi.mock("./pipeline/contentPipeline", () => ({
  runContentPipeline: vi.fn(),
  getProgress: vi.fn().mockReturnValue(null),
}));

describe("library.list", () => {
  it("returns all content items with character info for authenticated user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.library.list();

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Test Video Script");
    expect(result[0].characterName).toBe("TestBot");
    expect(result[1].title).toBe("Published TikTok");
    expect(result[1].status).toBe("published");
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.library.list()).rejects.toThrow();
  });
});

describe("library.get", () => {
  it("returns a specific content item for the owner", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.library.get({ id: 1 });

    expect(result.id).toBe(1);
    expect(result.title).toBe("Test Video Script");
  });

  it("rejects access to another user's content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.library.get({ id: 999 })).rejects.toThrow("Content not found");
  });

  it("rejects non-existent content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.library.get({ id: 404 })).rejects.toThrow("Content not found");
  });
});

describe("library.delete", () => {
  it("deletes content owned by the user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.library.delete({ id: 1 });

    expect(result).toEqual({ success: true });
  });

  it("rejects deleting another user's content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.library.delete({ id: 999 })).rejects.toThrow("Content not found");
  });
});

describe("library.updateMeta", () => {
  it("updates title and description for owned content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.library.updateMeta({
      id: 1,
      title: "Updated Title",
      description: "Updated description",
      tags: ["new", "tags"],
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects updating another user's content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.library.updateMeta({ id: 999, title: "Hacked" })
    ).rejects.toThrow("Content not found");
  });
});

describe("library.publish", () => {
  it("rejects publishing when no platform connection exists", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.library.publish({
        id: 1,
        platform: "youtube",
        title: "My Video",
        description: "A great video",
        tags: ["ai"],
      })
    ).rejects.toThrow(/NO_PLATFORM_KEY/);
  });

  it("rejects publishing non-existent content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.library.publish({
        id: 404,
        platform: "youtube",
        title: "My Video",
      })
    ).rejects.toThrow("Content not found");
  });

  it("rejects publishing another user's content", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.library.publish({
        id: 999,
        platform: "youtube",
        title: "Stolen Video",
      })
    ).rejects.toThrow("Content not found");
  });
});
