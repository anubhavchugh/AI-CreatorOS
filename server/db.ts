import { eq, desc, sql, and, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  waitlist,
  InsertWaitlist,
  characters,
  InsertCharacter,
  contentItems,
  InsertContentItem,
  creatorApiKeys,
  InsertCreatorApiKey,
  platformConnections,
  InsertPlatformConnection,
  payments,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: "user" | "admin";
  loginMethod?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name || null,
    role: data.role || "user",
    loginMethod: data.loginMethod || "email",
    lastSignedIn: new Date(),
  });

  return result[0].insertId;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(id: number, openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ openId }).where(eq(users.id, id));
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserStats() {
  const db = await getDb();
  if (!db) return { total: 0, free: 0, pro: 0, enterprise: 0 };
  const [total] = await db.select({ count: count() }).from(users);
  const [free] = await db.select({ count: count() }).from(users).where(eq(users.plan, "free"));
  const [pro] = await db.select({ count: count() }).from(users).where(eq(users.plan, "pro"));
  const [enterprise] = await db.select({ count: count() }).from(users).where(eq(users.plan, "enterprise"));
  return {
    total: total?.count || 0,
    free: free?.count || 0,
    pro: pro?.count || 0,
    enterprise: enterprise?.count || 0,
  };
}

export async function getUserByClerkId(clerkId: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Clerk ID is stored in the openId column
  const result = await db.select().from(users).where(eq(users.openId, clerkId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserFromClerk(data: {
  clerkId: string;
  email: string;
  name: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: data.clerkId,
    email: data.email,
    name: data.name,
    loginMethod: "clerk",
    role: "user",
    lastSignedIn: new Date(),
  });

  return result[0].insertId;
}

// ==================== WAITLIST ====================

export async function addToWaitlist(data: InsertWaitlist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(waitlist).values(data).onDuplicateKeyUpdate({ set: { name: data.name } });
}

export async function getWaitlistEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
}

export async function getWaitlistStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, invited: 0, joined: 0 };
  const [total] = await db.select({ count: count() }).from(waitlist);
  const [pending] = await db.select({ count: count() }).from(waitlist).where(eq(waitlist.status, "pending"));
  const [invited] = await db.select({ count: count() }).from(waitlist).where(eq(waitlist.status, "invited"));
  const [joined] = await db.select({ count: count() }).from(waitlist).where(eq(waitlist.status, "joined"));
  return {
    total: total?.count || 0,
    pending: pending?.count || 0,
    invited: invited?.count || 0,
    joined: joined?.count || 0,
  };
}

export async function updateWaitlistStatus(id: number, status: "pending" | "invited" | "joined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(waitlist).set({ status }).where(eq(waitlist.id, id));
}

// ==================== CHARACTERS ====================

export async function createCharacter(data: InsertCharacter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(characters).values(data);
  return result[0].insertId;
}

export async function getUserCharacters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characters).where(eq(characters.userId, userId)).orderBy(desc(characters.createdAt));
}

export async function getCharacterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCharacter(id: number, data: Partial<InsertCharacter>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(characters).set(data).where(eq(characters.id, id));
}

export async function deleteCharacter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(characters).where(eq(characters.id, id));
}

// ==================== CONTENT ITEMS ====================

export async function createContentItem(data: InsertContentItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentItems).values(data);
  return result[0].insertId;
}

export async function getUserContentItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).where(eq(contentItems.userId, userId)).orderBy(desc(contentItems.createdAt));
}

export async function getCharacterContentItems(characterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).where(eq(contentItems.characterId, characterId)).orderBy(desc(contentItems.createdAt));
}

export async function updateContentItem(id: number, data: Partial<InsertContentItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentItems).set(data).where(eq(contentItems.id, id));
}

export async function deleteContentItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
}

export async function getContentItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserContentWithCharacters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: contentItems.id,
      characterId: contentItems.characterId,
      userId: contentItems.userId,
      title: contentItems.title,
      type: contentItems.type,
      platform: contentItems.platform,
      status: contentItems.status,
      script: contentItems.script,
      mediaUrl: contentItems.mediaUrl,
      thumbnailUrl: contentItems.thumbnailUrl,
      description: contentItems.description,
      tags: contentItems.tags,
      publishedUrl: contentItems.publishedUrl,
      publishError: contentItems.publishError,
      scheduledAt: contentItems.scheduledAt,
      publishedAt: contentItems.publishedAt,
      views: contentItems.views,
      likes: contentItems.likes,
      comments: contentItems.comments,
      createdAt: contentItems.createdAt,
      updatedAt: contentItems.updatedAt,
      characterName: characters.name,
      characterAvatarUrl: characters.avatarUrl,
    })
    .from(contentItems)
    .leftJoin(characters, eq(contentItems.characterId, characters.id))
    .where(eq(contentItems.userId, userId))
    .orderBy(desc(contentItems.createdAt));
}

export async function getPlatformConnectionForUser(userId: number, platform: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(platformConnections)
    .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform), eq(platformConnections.isConnected, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== CREATOR API KEYS ====================

export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creatorApiKeys).where(eq(creatorApiKeys.userId, userId));
}

export async function upsertApiKey(data: InsertCreatorApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(creatorApiKeys)
    .where(and(eq(creatorApiKeys.userId, data.userId), eq(creatorApiKeys.service, data.service)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(creatorApiKeys)
      .set({ apiKey: data.apiKey, model: data.model, isActive: data.isActive ?? true })
      .where(eq(creatorApiKeys.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(creatorApiKeys).values(data);
    return result[0].insertId;
  }
}

export async function deleteApiKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(creatorApiKeys).where(and(eq(creatorApiKeys.id, id), eq(creatorApiKeys.userId, userId)));
}

// ==================== PLATFORM CONNECTIONS ====================

export async function getUserPlatformConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
}

export async function upsertPlatformConnection(data: InsertPlatformConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(platformConnections)
    .where(and(eq(platformConnections.userId, data.userId), eq(platformConnections.platform, data.platform)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(platformConnections)
      .set({
        apiKey: data.apiKey,
        accessToken: data.accessToken,
        channelId: data.channelId,
        channelName: data.channelName,
        isConnected: data.isConnected ?? true,
      })
      .where(eq(platformConnections.id, existing[0].id));
  } else {
    await db.insert(platformConnections).values(data);
  }
}

// ==================== PAYMENTS / REVENUE ====================

export async function getRevenueStats() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, monthlyRevenue: 0, totalPayments: 0 };

  const [total] = await db
    .select({ sum: sql<number>`COALESCE(SUM(amount), 0)`, count: count() })
    .from(payments)
    .where(eq(payments.status, "succeeded"));

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthly] = await db
    .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(payments)
    .where(and(eq(payments.status, "succeeded"), sql`createdAt >= ${firstOfMonth}`));

  return {
    totalRevenue: total?.sum || 0,
    monthlyRevenue: monthly?.sum || 0,
    totalPayments: total?.count || 0,
  };
}

export async function getRecentPayments(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: payments.id,
      userId: payments.userId,
      amount: payments.amount,
      currency: payments.currency,
      plan: payments.plan,
      status: payments.status,
      createdAt: payments.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

// ==================== DASHBOARD STATS ====================

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalCharacters: 0, totalContent: 0, activeCharacters: 0, publishedContent: 0 };

  const [charCount] = await db
    .select({ count: count() })
    .from(characters)
    .where(eq(characters.userId, userId));

  const [activeChars] = await db
    .select({ count: count() })
    .from(characters)
    .where(and(eq(characters.userId, userId), eq(characters.status, "active")));

  const [contentCount] = await db
    .select({ count: count() })
    .from(contentItems)
    .where(eq(contentItems.userId, userId));

  const [publishedCount] = await db
    .select({ count: count() })
    .from(contentItems)
    .where(and(eq(contentItems.userId, userId), eq(contentItems.status, "published")));

  return {
    totalCharacters: charCount?.count || 0,
    activeCharacters: activeChars?.count || 0,
    totalContent: contentCount?.count || 0,
    publishedContent: publishedCount?.count || 0,
  };
}

export async function getDashboardCharacters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(desc(characters.updatedAt))
    .limit(5);
}

export async function getDashboardPipeline(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: contentItems.id,
      title: contentItems.title,
      status: contentItems.status,
      platform: contentItems.platform,
      type: contentItems.type,
      createdAt: contentItems.createdAt,
      characterName: characters.name,
    })
    .from(contentItems)
    .leftJoin(characters, eq(contentItems.characterId, characters.id))
    .where(eq(contentItems.userId, userId))
    .orderBy(desc(contentItems.updatedAt))
    .limit(10);
}
