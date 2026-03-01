import { describe, it, expect } from "vitest";

describe("Razorpay configuration", () => {
  it("should have RAZORPAY_KEY_ID set", () => {
    const key = process.env.RAZORPAY_KEY_ID;
    expect(key).toBeDefined();
    expect(key).toBeTruthy();
    expect(key!.startsWith("rzp_live_") || key!.startsWith("rzp_test_")).toBe(true);
  });

  it("should have RAZORPAY_KEY_SECRET set", () => {
    const key = process.env.RAZORPAY_KEY_SECRET;
    expect(key).toBeDefined();
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should be able to create Razorpay instance", async () => {
    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    expect(instance).toBeDefined();
    expect(instance.orders).toBeDefined();
    expect(instance.payments).toBeDefined();
  });
});
