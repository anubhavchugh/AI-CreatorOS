import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getAuth, clerkClient } from "@clerk/express";
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
        // First-time login — auto-create user
        // Session claims often don't include email/name, so fetch from Clerk API
        let email = "";
        let name = "";

        // Try session claims first
        const sessionClaims = auth.sessionClaims as any;
        email = sessionClaims?.email ?? sessionClaims?.primary_email_address ?? "";
        name = sessionClaims?.name ?? sessionClaims?.full_name ?? "";

        // If no email in claims, fetch from Clerk Backend API
        if (!email) {
          try {
            const clerkUser = await clerkClient.users.getUser(auth.userId);
            email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
            name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "";
          } catch (clerkErr: any) {
            console.error('[Auth] Failed to fetch user from Clerk API:', clerkErr.message);
          }
        }

        if (email) {
          try {
            const userId = await db.createUserFromClerk({
              clerkId: auth.userId,
              email,
              name: name || null,
            });
            user = await db.getUserById(userId) ?? null;
          } catch (createErr: any) {
            // Maybe user already exists with a different openId? Try by email
            const existingUser = await db.getUserByEmail(email);
            if (existingUser) {
              // Update the existing user's openId to the Clerk ID
              await db.updateUserOpenId(existingUser.id, auth.userId);
              user = await db.getUserByClerkId(auth.userId) ?? null;
            }
          }
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
