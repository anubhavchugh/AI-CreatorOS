/**
 * Direct AWS S3 storage helpers.
 * Uses @aws-sdk/client-s3 for file uploads and presigned URLs.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    const config: any = {
      region: ENV.s3Region || "us-east-1",
    };

    if (ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
      config.credentials = {
        accessKeyId: ENV.s3AccessKeyId,
        secretAccessKey: ENV.s3SecretAccessKey,
      };
    }

    if (ENV.s3Endpoint) {
      config.endpoint = ENV.s3Endpoint;
      config.forcePathStyle = true; // needed for S3-compatible providers like MinIO, R2
    }

    _s3 = new S3Client(config);
  }
  return _s3;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Upload bytes to S3.
 * Returns the public URL (or a presigned URL if the bucket is private).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const bucket = ENV.s3Bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured. Set S3_BUCKET environment variable.");
  }

  const s3 = getS3Client();
  const key = normalizeKey(relKey);

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Build the URL
  let url: string;
  if (ENV.s3Endpoint) {
    // S3-compatible provider — construct URL manually
    url = `${ENV.s3Endpoint}/${bucket}/${key}`;
  } else {
    // Standard AWS S3
    url = `https://${bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
  }

  return { key, url };
}

/**
 * Get a presigned download URL for a file in S3.
 */
export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const bucket = ENV.s3Bucket;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured. Set S3_BUCKET environment variable.");
  }

  const s3 = getS3Client();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn }
  );

  return { key, url };
}
