import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required R2 env var: ${name}. Add it to your .env file.`
    );
  }
  return value;
}

export const R2_BUCKET = requireEnv("R2_BUCKET_NAME");
const R2_PUBLIC_URL = requireEnv("R2_PUBLIC_URL").replace(/\/+$/, "");

export const r2 = new S3Client({
  region: "auto",
  endpoint: requireEnv("R2_S3_ENDPOINT"),
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

export function r2KeyForDocument(ownerId: string): string {
  return `documents/${ownerId}/${crypto.randomUUID()}.enc`;
}

export function r2KeyForAvatar(userId: string, ext: string): string {
  return `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
}

export function publicUrlFor(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresIn = 120
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

export async function presignGetUrl(
  key: string,
  expiresIn = 120
): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
