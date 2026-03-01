import { describe, it, expect } from "vitest";

describe("Cloudflare R2 Storage", () => {
  it("should have S3_BUCKET configured", () => {
    expect(process.env.S3_BUCKET).toBeTruthy();
    expect(process.env.S3_BUCKET).toBe("ai-creatoros");
  });

  it("should have S3_ENDPOINT configured for Cloudflare R2", () => {
    expect(process.env.S3_ENDPOINT).toBeTruthy();
    expect(process.env.S3_ENDPOINT).toContain("r2.cloudflarestorage.com");
  });

  it("should have S3_ACCESS_KEY_ID configured", () => {
    expect(process.env.S3_ACCESS_KEY_ID).toBeTruthy();
  });

  it("should have S3_SECRET_ACCESS_KEY configured", () => {
    expect(process.env.S3_SECRET_ACCESS_KEY).toBeTruthy();
  });

  it("should have S3_PUBLIC_URL configured for public access", () => {
    expect(process.env.S3_PUBLIC_URL).toBeTruthy();
    expect(process.env.S3_PUBLIC_URL).toContain("r2.dev");
  });

  it("should upload and return correct public URL", async () => {
    const { storagePut } = await import("./storage");

    const testContent = `test-${Date.now()}`;
    const testKey = `test/storage-validation-${Date.now()}.txt`;

    const result = await storagePut(testKey, testContent, "text/plain");

    expect(result.key).toBe(testKey);
    expect(result.url).toContain("r2.dev");
    expect(result.url).toContain(testKey);

    // Verify the file is accessible via the public URL
    const response = await fetch(result.url);
    expect(response.ok).toBe(true);
    const body = await response.text();
    expect(body).toBe(testContent);
  });
});
