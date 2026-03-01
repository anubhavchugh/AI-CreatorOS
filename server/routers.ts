import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  addToWaitlist,
  getWaitlistEntries,
  getWaitlistStats,
  updateWaitlistStatus,
  createCharacter,
  getUserCharacters,
  getCharacterById,
  updateCharacter,
  deleteCharacter,
  createContentItem,
  getUserContentItems,
  getCharacterContentItems,
  updateContentItem,
  deleteContentItem,
  getContentItemById,
  getUserContentWithCharacters,
  getPlatformConnectionForUser,
  getUserApiKeys,
  upsertApiKey,
  deleteApiKey,
  getUserPlatformConnections,
  upsertPlatformConnection,
  getAllUsers,
  getUserStats,
  getRevenueStats,
  getRecentPayments,
} from "./db";
import { createCheckoutSession } from "./stripe/stripe";
import { PLANS, type PlanKey } from "./stripe/products";
import { runContentPipeline, getProgress } from "./pipeline/contentPipeline";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== WAITLIST ====================
  waitlist: router({
    join: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await addToWaitlist({
          email: input.email,
          name: input.name || null,
          source: input.source || "landing",
        });
        return { success: true };
      }),
  }),

  // ==================== CHARACTERS ====================
  characters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserCharacters(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const character = await getCharacterById(input.id);
        if (!character || character.userId !== ctx.user.id) {
          throw new Error("Character not found");
        }
        return character;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        niche: z.string().optional(),
        personality: z.string().optional(),
        backstory: z.string().optional(),
        voiceStyle: z.string().optional(),
        visualStyle: z.enum(["photorealistic", "anime", "cartoon", "3d"]).optional(),
        avatarUrl: z.string().optional(),
        platforms: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createCharacter({
          ...input,
          userId: ctx.user.id,
          platforms: input.platforms || [],
          status: "draft",
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        niche: z.string().optional(),
        personality: z.string().optional(),
        backstory: z.string().optional(),
        voiceStyle: z.string().optional(),
        visualStyle: z.enum(["photorealistic", "anime", "cartoon", "3d"]).optional(),
        avatarUrl: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        status: z.enum(["draft", "active", "paused", "archived"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const character = await getCharacterById(input.id);
        if (!character || character.userId !== ctx.user.id) {
          throw new Error("Character not found");
        }
        const { id, ...data } = input;
        await updateCharacter(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const character = await getCharacterById(input.id);
        if (!character || character.userId !== ctx.user.id) {
          throw new Error("Character not found");
        }
        await deleteCharacter(input.id);
        return { success: true };
      }),
  }),

  // ==================== CONTENT ====================
  content: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserContentItems(ctx.user.id);
    }),

    byCharacter: protectedProcedure
      .input(z.object({ characterId: z.number() }))
      .query(async ({ input }) => {
        return getCharacterContentItems(input.characterId);
      }),

    create: protectedProcedure
      .input(z.object({
        characterId: z.number(),
        title: z.string().min(1),
        type: z.enum(["short", "long_form", "image", "story", "reel"]).optional(),
        platform: z.string().optional(),
        script: z.string().optional(),
        scheduledAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createContentItem({
          ...input,
          userId: ctx.user.id,
          status: "idea",
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        type: z.enum(["short", "long_form", "image", "story", "reel"]).optional(),
        platform: z.string().optional(),
        status: z.enum(["idea", "scripting", "generating", "review", "scheduled", "published", "failed"]).optional(),
        script: z.string().optional(),
        mediaUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        scheduledAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateContentItem(id, data);
        return { success: true };
      }),
  }),

  // ==================== CREATOR SETTINGS ====================
  settings: router({
    getApiKeys: protectedProcedure.query(async ({ ctx }) => {
      const keys = await getUserApiKeys(ctx.user.id);
      // Mask API keys for security — only show last 4 chars
      return keys.map((k) => ({
        ...k,
        apiKey: k.apiKey ? `${"•".repeat(20)}${k.apiKey.slice(-4)}` : "",
      }));
    }),

    saveApiKey: protectedProcedure
      .input(z.object({
        service: z.string(),
        apiKey: z.string(),
        model: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await upsertApiKey({
          userId: ctx.user.id,
          service: input.service,
          apiKey: input.apiKey,
          model: input.model || null,
        });
        return { success: true };
      }),

    deleteApiKey: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteApiKey(input.id, ctx.user.id);
        return { success: true };
      }),

    getPlatformConnections: protectedProcedure.query(async ({ ctx }) => {
      return getUserPlatformConnections(ctx.user.id);
    }),

    savePlatformConnection: protectedProcedure
      .input(z.object({
        platform: z.string(),
        apiKey: z.string().optional(),
        accessToken: z.string().optional(),
        channelId: z.string().optional(),
        channelName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await upsertPlatformConnection({
          userId: ctx.user.id,
          platform: input.platform,
          apiKey: input.apiKey || null,
          accessToken: input.accessToken || null,
          channelId: input.channelId || null,
          channelName: input.channelName || null,
          isConnected: true,
        });
        return { success: true };
      }),
  }),

  // ==================== STRIPE / BILLING ====================
  billing: router({
    getPlans: publicProcedure.query(() => {
      return Object.entries(PLANS).map(([key, plan]) => ({
        key,
        ...plan,
      }));
    }),

    createCheckout: protectedProcedure
      .input(z.object({
        plan: z.enum(["pro", "enterprise"]),
        origin: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const url = await createCheckoutSession(
          ctx.user.id,
          ctx.user.email || "",
          ctx.user.name || null,
          input.plan as PlanKey,
          input.origin
        );
        return { url };
      }),

    currentPlan: protectedProcedure.query(async ({ ctx }) => {
      return {
        plan: ctx.user.plan || "free",
        features: PLANS[(ctx.user.plan || "free") as PlanKey]?.features || [],
        limits: PLANS[(ctx.user.plan || "free") as PlanKey]?.limits || {},
      };
    }),
  }),

  // ==================== CONTENT LIBRARY ====================
  library: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserContentWithCharacters(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const item = await getContentItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Content not found");
        }
        return item;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const item = await getContentItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Content not found");
        }
        await deleteContentItem(input.id, ctx.user.id);
        return { success: true };
      }),

    updateMeta: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        platform: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const item = await getContentItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Content not found");
        }
        const { id, ...data } = input;
        await updateContentItem(id, data);
        return { success: true };
      }),

    publish: protectedProcedure
      .input(z.object({
        id: z.number(),
        platform: z.string(),
        title: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const item = await getContentItemById(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Content not found");
        }

        // Check platform connection
        const connection = await getPlatformConnectionForUser(ctx.user.id, input.platform);
        if (!connection) {
          throw new Error(`NO_PLATFORM_KEY: Connect your ${input.platform} account in Settings → Platforms to publish content.`);
        }

        // Update status to publishing
        await updateContentItem(input.id, {
          status: "scheduled",
          platform: input.platform,
          description: input.description || null,
          tags: input.tags || [],
        });

        try {
          // Attempt to publish using platform API
          const { publishToYouTube, publishToTikTok } = await import("./pipeline/platformPublisher");

          let publishedUrl: string;

          if (input.platform === "youtube") {
            publishedUrl = await publishToYouTube({
              accessToken: connection.accessToken || connection.apiKey || "",
              title: input.title,
              description: input.description || "",
              tags: input.tags || [],
              mediaUrl: item.mediaUrl,
              thumbnailUrl: item.thumbnailUrl,
            });
          } else if (input.platform === "tiktok") {
            publishedUrl = await publishToTikTok({
              accessToken: connection.accessToken || connection.apiKey || "",
              title: input.title,
              description: input.description || "",
              mediaUrl: item.mediaUrl,
            });
          } else {
            throw new Error(`Publishing to ${input.platform} is not yet supported. YouTube and TikTok are available.`);
          }

          // Mark as published
          await updateContentItem(input.id, {
            status: "published",
            publishedUrl,
            publishedAt: new Date(),
            publishError: null,
          });

          return { success: true, publishedUrl };
        } catch (error: any) {
          // Mark as failed with error
          await updateContentItem(input.id, {
            status: "failed",
            publishError: error.message || "Publishing failed",
          });
          throw error;
        }
      }),
  }),

  // ==================== CONTENT PIPELINE ====================
  pipeline: router({
    generate: protectedProcedure
      .input(z.object({
        characterId: z.number(),
        topic: z.string().min(1),
        contentType: z.enum(["short", "long_form", "image", "story", "reel"]).default("short"),
        platform: z.string().default("youtube"),
        tone: z.string().optional(),
        duration: z.string().optional(),
        additionalInstructions: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify character belongs to user
        const character = await getCharacterById(input.characterId);
        if (!character || character.userId !== ctx.user.id) {
          throw new Error("Character not found");
        }

        const result = await runContentPipeline({
          characterId: input.characterId,
          userId: ctx.user.id,
          topic: input.topic,
          contentType: input.contentType,
          platform: input.platform,
          tone: input.tone,
          duration: input.duration,
          additionalInstructions: input.additionalInstructions,
        });

        return result;
      }),

    progress: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ input }) => {
        return getProgress(input.contentId) || null;
      }),
  }),

  // ==================== ADMIN ====================
  admin: router({
    // Waitlist management
    waitlist: adminProcedure.query(async () => {
      return getWaitlistEntries();
    }),

    waitlistStats: adminProcedure.query(async () => {
      return getWaitlistStats();
    }),

    updateWaitlistStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "invited", "joined"]),
      }))
      .mutation(async ({ input }) => {
        await updateWaitlistStatus(input.id, input.status);
        return { success: true };
      }),

    // User management
    users: adminProcedure.query(async () => {
      return getAllUsers();
    }),

    userStats: adminProcedure.query(async () => {
      return getUserStats();
    }),

    // Revenue
    revenueStats: adminProcedure.query(async () => {
      return getRevenueStats();
    }),

    recentPayments: adminProcedure.query(async () => {
      return getRecentPayments();
    }),
  }),
});

export type AppRouter = typeof appRouter;
