/**
 * Auth service — delegates to Clerk for authentication.
 * This file exists for backward compatibility with code that imports `sdk`.
 * The actual auth logic is in context.ts using @clerk/express.
 */

// Re-export nothing — Clerk handles auth via middleware.
// Kept as a stub so existing imports don't break during migration.
export const sdk = {
  // No-op: Clerk middleware handles auth in context.ts
};
