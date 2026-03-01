import { describe, it, expect } from "vitest";

describe("Clerk configuration", () => {
  it("should have CLERK_SECRET_KEY set", () => {
    const key = process.env.CLERK_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key).toBeTruthy();
    expect(key!.startsWith("sk_test_") || key!.startsWith("sk_live_")).toBe(true);
  });

  it("should have VITE_CLERK_PUBLISHABLE_KEY set", () => {
    const key = process.env.VITE_CLERK_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key).toBeTruthy();
    expect(key!.startsWith("pk_test_") || key!.startsWith("pk_live_")).toBe(true);
  });

  it("should be able to import @clerk/express without error", async () => {
    const clerk = await import("@clerk/express");
    expect(clerk.clerkMiddleware).toBeDefined();
    expect(typeof clerk.clerkMiddleware).toBe("function");
  });
});
