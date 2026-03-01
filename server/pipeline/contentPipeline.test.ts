import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the db module
vi.mock("../db", () => ({
  addToWaitlist: vi.fn().mockResolvedValue(undefined),
  getWaitlistEntries: vi.fn().mockResolvedValue([]),
  getWaitlistStats: vi.fn().mockResolvedValue({ total: 0, pending: 0, invited: 0, joined: 0 }),
  updateWaitlistStatus: vi.fn().mockResolvedValue(undefined),
  createCharacter: vi.fn().mockResolvedValue(1),
  getUserCharacters: vi.fn().mockResolvedValue([]),
  getCharacterById: vi.fn().mockResolvedValue({
    id: 1, userId: 1, name: "Nova", niche: "tech", status: "active",
    personality: "Friendly and knowledgeable",
    visualStyle: "photorealistic",
    voiceStyle: "professional",
    platforms: ["youtube"],
  }),
  updateCharacter: vi.fn().mockResolvedValue(undefined),
  deleteCharacter: vi.fn().mockResolvedValue(undefined),
  createContentItem: vi.fn().mockResolvedValue(1),
  getUserContentItems: vi.fn().mockResolvedValue([]),
  getCharacterContentItems: vi.fn().mockResolvedValue([]),
  updateContentItem: vi.fn().mockResolvedValue(undefined),
  getUserApiKeys: vi.fn().mockResolvedValue([]),
  upsertApiKey: vi.fn().mockResolvedValue(undefined),
  deleteApiKey: vi.fn().mockResolvedValue(undefined),
  getUserPlatformConnections: vi.fn().mockResolvedValue([]),
  upsertPlatformConnection: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserStats: vi.fn().mockResolvedValue({ total: 0, pro: 0, enterprise: 0 }),
  getRevenueStats: vi.fn().mockResolvedValue({ totalRevenue: 0, monthlyRevenue: 0, totalPayments: 0 }),
  getRecentPayments: vi.fn().mockResolvedValue([]),
}));

// Mock stripe
vi.mock("../stripe/stripe", () => ({
  createCheckoutSession: vi.fn().mockResolvedValue("https://checkout.stripe.com/test"),
}));

// Mock the content pipeline
const mockRunContentPipeline = vi.fn();
const mockGetProgress = vi.fn();

vi.mock("./contentPipeline", () => ({
  runContentPipeline: (...args: any[]) => mockRunContentPipeline(...args),
  getProgress: (...args: any[]) => mockGetProgress(...args),
}));

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    plan: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ==================== PIPELINE GENERATE ====================
describe("pipeline.generate", () => {
  it("successfully generates content with all steps", async () => {
    mockRunContentPipeline.mockResolvedValue({
      contentId: 42,
      script: "Hello everyone! Welcome to my tech review...",
      scriptModel: "gpt-4o",
      audioUrl: "https://storage.example.com/audio/voice.mp3",
      voiceModel: "eleven_multilingual_v2",
      thumbnailUrl: "https://storage.example.com/thumbnails/thumb.png",
      imageModel: "flux-1.1-pro",
      voiceSkipped: false,
      thumbnailSkipped: false,
      missingKeys: [],
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.generate({
      characterId: 1,
      topic: "iPhone 18 Review",
      contentType: "short",
      platform: "youtube",
    });

    expect(result.contentId).toBe(42);
    expect(result.script).toContain("Hello everyone");
    expect(result.scriptModel).toBe("gpt-4o");
    expect(result.audioUrl).toBeTruthy();
    expect(result.thumbnailUrl).toBeTruthy();
    expect(result.voiceSkipped).toBe(false);
    expect(result.thumbnailSkipped).toBe(false);
    expect(result.missingKeys).toHaveLength(0);
  });

  it("generates content with skipped voice and thumbnail when keys are missing", async () => {
    mockRunContentPipeline.mockResolvedValue({
      contentId: 43,
      script: "Here's my take on the latest AI trends...",
      scriptModel: "gpt-4o",
      audioUrl: null,
      voiceModel: null,
      thumbnailUrl: null,
      imageModel: null,
      voiceSkipped: true,
      thumbnailSkipped: true,
      missingKeys: ["Voice (ElevenLabs or PlayHT)", "Image (Replicate, fal.ai, or OpenAI)"],
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.generate({
      characterId: 1,
      topic: "AI Trends 2026",
      contentType: "long_form",
      platform: "youtube",
    });

    expect(result.contentId).toBe(43);
    expect(result.script).toBeTruthy();
    expect(result.voiceSkipped).toBe(true);
    expect(result.thumbnailSkipped).toBe(true);
    expect(result.missingKeys).toContain("Voice (ElevenLabs or PlayHT)");
    expect(result.missingKeys).toContain("Image (Replicate, fal.ai, or OpenAI)");
  });

  it("rejects generation for a character that doesn't belong to user", async () => {
    const { getCharacterById } = await import("../db");
    (getCharacterById as any).mockResolvedValueOnce({
      id: 99, userId: 999, name: "Other", niche: "tech", status: "active",
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.generate({
        characterId: 99,
        topic: "Test Topic",
      })
    ).rejects.toThrow("Character not found");
  });

  it("rejects generation for non-existent character", async () => {
    const { getCharacterById } = await import("../db");
    (getCharacterById as any).mockResolvedValueOnce(null);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.generate({
        characterId: 999,
        topic: "Test Topic",
      })
    ).rejects.toThrow("Character not found");
  });

  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.generate({
        characterId: 1,
        topic: "Test",
      })
    ).rejects.toThrow();
  });

  it("requires a non-empty topic", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.generate({
        characterId: 1,
        topic: "",
      })
    ).rejects.toThrow();
  });

  it("accepts optional parameters (tone, duration, additionalInstructions)", async () => {
    mockRunContentPipeline.mockResolvedValue({
      contentId: 44,
      script: "Custom tone script...",
      scriptModel: "gpt-4o",
      audioUrl: null,
      voiceModel: null,
      thumbnailUrl: null,
      imageModel: null,
      voiceSkipped: true,
      thumbnailSkipped: true,
      missingKeys: [],
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.generate({
      characterId: 1,
      topic: "Custom Content",
      contentType: "reel",
      platform: "tiktok",
      tone: "humorous",
      duration: "30 seconds",
      additionalInstructions: "Include a trending sound reference",
    });

    expect(result.contentId).toBe(44);
    expect(mockRunContentPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        characterId: 1,
        userId: 1,
        topic: "Custom Content",
        contentType: "reel",
        platform: "tiktok",
        tone: "humorous",
        duration: "30 seconds",
        additionalInstructions: "Include a trending sound reference",
      })
    );
  });

  it("propagates pipeline errors correctly", async () => {
    mockRunContentPipeline.mockRejectedValue(
      new Error("NO_SCRIPT_KEY: Add an OpenAI, Anthropic, or Google API key in Settings → API Keys to generate scripts.")
    );

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.generate({
        characterId: 1,
        topic: "Test",
      })
    ).rejects.toThrow("NO_SCRIPT_KEY");
  });
});

// ==================== PIPELINE PROGRESS ====================
describe("pipeline.progress", () => {
  it("returns progress for an active pipeline", async () => {
    mockGetProgress.mockReturnValue({
      contentId: 42,
      currentStep: "voice",
      steps: {
        scripting: { status: "complete", result: "Script generated with gpt-4o" },
        voice: { status: "running" },
        thumbnail: { status: "pending" },
      },
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.progress({ contentId: 42 });

    expect(result).toBeTruthy();
    expect(result?.currentStep).toBe("voice");
    expect(result?.steps.scripting.status).toBe("complete");
    expect(result?.steps.voice.status).toBe("running");
    expect(result?.steps.thumbnail.status).toBe("pending");
  });

  it("returns null for non-existent content", async () => {
    mockGetProgress.mockReturnValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.progress({ contentId: 999 });

    expect(result).toBeNull();
  });

  it("returns completed progress with all steps done", async () => {
    mockGetProgress.mockReturnValue({
      contentId: 42,
      currentStep: "complete",
      steps: {
        scripting: { status: "complete", result: "Script generated with gpt-4o" },
        voice: { status: "complete", result: "Voice generated with eleven_multilingual_v2" },
        thumbnail: { status: "complete", result: "Thumbnail generated with flux-1.1-pro" },
      },
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.progress({ contentId: 42 });

    expect(result?.currentStep).toBe("complete");
    expect(result?.steps.scripting.status).toBe("complete");
    expect(result?.steps.voice.status).toBe("complete");
    expect(result?.steps.thumbnail.status).toBe("complete");
  });

  it("returns failed progress with error details", async () => {
    mockGetProgress.mockReturnValue({
      contentId: 42,
      currentStep: "failed",
      error: "OpenAI API error (401): Invalid API key",
      steps: {
        scripting: { status: "failed", error: "OpenAI API error (401): Invalid API key" },
        voice: { status: "pending" },
        thumbnail: { status: "pending" },
      },
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.progress({ contentId: 42 });

    expect(result?.currentStep).toBe("failed");
    expect(result?.error).toContain("Invalid API key");
    expect(result?.steps.scripting.status).toBe("failed");
  });

  it("returns progress with skipped steps", async () => {
    mockGetProgress.mockReturnValue({
      contentId: 42,
      currentStep: "complete",
      steps: {
        scripting: { status: "complete", result: "Script generated with gpt-4o" },
        voice: { status: "skipped", result: "Add an ElevenLabs or PlayHT API key" },
        thumbnail: { status: "skipped", result: "Add a Replicate or fal.ai API key" },
      },
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.progress({ contentId: 42 });

    expect(result?.currentStep).toBe("complete");
    expect(result?.steps.voice.status).toBe("skipped");
    expect(result?.steps.thumbnail.status).toBe("skipped");
  });

  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.progress({ contentId: 42 })
    ).rejects.toThrow();
  });
});
