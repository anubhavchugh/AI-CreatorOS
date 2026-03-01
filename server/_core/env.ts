export const ENV = {
  // Clerk auth
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Runtime
  isProduction: process.env.NODE_ENV === "production",
  // S3 / Cloudflare R2 storage
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "", // Cloudflare R2 endpoint
  s3PublicUrl: process.env.S3_PUBLIC_URL ?? "", // R2 public bucket URL (e.g. https://pub-xxx.r2.dev)
  // Razorpay
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  // Admin email (first user with this email gets admin role)
  adminEmail: process.env.ADMIN_EMAIL ?? "",
};
