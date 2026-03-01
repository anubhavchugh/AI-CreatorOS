import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getAuth } from "@clerk/express";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const auth = getAuth(opts.req);
    if (auth?.userId) {
      // Clerk userId is the unique Clerk user ID (e.g. "user_2abc...")
      // We use it as the openId field in our users table
      user = await db.getUserByClerkId(auth.userId) ?? null;

      if (!user) {
        // First-time login — auto-create user from Clerk session claims
        // Clerk session claims provide email/name
        const sessionClaims = auth.sessionClaims as any;
        const email = sessionClaims?.email ?? sessionClaims?.primary_email_address ?? "";
        const name = sessionClaims?.name ?? sessionClaims?.full_name ?? "";

        if (email) {
          const userId = await db.createUserFromClerk({
            clerkId: auth.userId,
            email,
            name: name || null,
          });
          user = await db.getUserById(userId) ?? null;
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
