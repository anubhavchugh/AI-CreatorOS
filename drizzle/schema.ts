import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Waitlist signups from the landing page
 */
export const waitlist = mysqlTable("waitlist", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  source: varchar("source", { length: 100 }).default("landing"),
  status: mysqlEnum("status", ["pending", "invited", "joined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = typeof waitlist.$inferInsert;

/**
 * AI Characters created by users
 */
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  niche: varchar("niche", { length: 100 }),
  personality: text("personality"),
  backstory: text("backstory"),
  voiceStyle: varchar("voiceStyle", { length: 100 }),
  visualStyle: mysqlEnum("visualStyle", ["photorealistic", "anime", "cartoon", "3d"]).default("photorealistic"),
  avatarUrl: text("avatarUrl"),
  platforms: json("platforms").$type<string[]>(),
  status: mysqlEnum("status", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
  totalViews: bigint("totalViews", { mode: "number" }).default(0),
  totalSubscribers: int("totalSubscribers").default(0),
  totalRevenue: int("totalRevenue").default(0), // stored in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

/**
 * Content items generated for characters
 */
export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  type: mysqlEnum("type", ["short", "long_form", "image", "story", "reel"]).default("short").notNull(),
  platform: varchar("platform", { length: 50 }),
  status: mysqlEnum("status", ["idea", "scripting", "generating", "review", "scheduled", "published", "failed"]).default("idea").notNull(),
  script: text("script"),
  mediaUrl: text("mediaUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  description: text("description"),
  tags: json("tags").$type<string[]>(),
  publishedUrl: text("publishedUrl"),
  publishError: text("publishError"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  views: bigint("views", { mode: "number" }).default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

/**
 * Creator API keys for external AI services
 */
export const creatorApiKeys = mysqlTable("creator_api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  service: varchar("service", { length: 100 }).notNull(), // e.g. "openai", "elevenlabs", "replicate"
  apiKey: text("apiKey").notNull(), // encrypted in production
  model: varchar("model", { length: 100 }), // selected model for this service
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorApiKey = typeof creatorApiKeys.$inferSelect;
export type InsertCreatorApiKey = typeof creatorApiKeys.$inferInsert;

/**
 * Platform connections (YouTube, TikTok, Instagram API keys)
 */
export const platformConnections = mysqlTable("platform_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // "youtube", "tiktok", "instagram"
  apiKey: text("apiKey"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  channelId: varchar("channelId", { length: 255 }),
  channelName: varchar("channelName", { length: 255 }),
  isConnected: boolean("isConnected").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = typeof platformConnections.$inferInsert;

/**
 * Payment/subscription events for revenue tracking
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("usd"),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).notNull(),
  status: mysqlEnum("status", ["succeeded", "pending", "failed", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
