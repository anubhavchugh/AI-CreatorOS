/**
 * Auth routes — Clerk handles authentication entirely client-side.
 * No server-side OAuth callback or login/register routes are needed.
 * 
 * This file is kept as a stub so the import in index.ts doesn't break.
 * The registerOAuthRoutes function is now a no-op.
 */
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // No-op: Clerk handles auth via its React components and Express middleware.
  console.log("[Auth] Using Clerk for authentication — no server OAuth routes needed.");
}
