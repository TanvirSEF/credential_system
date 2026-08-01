import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface ObjectStorageConfig {
  bucket: string;
  publicUrl: string;
  client: S3Client;
}

let cachedConfig: ObjectStorageConfig | null = null;

function firstDefined(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function required(names: string[]): string {
  const value = firstDefined(...names);
  if (!value) {
    throw new Error(`Missing object storage environment variable: ${names.join(" or ")}`);
  }
  return value;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be 'true' or 'false'.`);
}

function getConfig(): ObjectStorageConfig {
  if (cachedConfig) return cachedConfig;

  const provider = process.env.STORAGE_PROVIDER || "s3-compatible";
  if (provider !== "s3-compatible") {
    throw new Error(
      `Unsupported STORAGE_PROVIDER '${provider}'. This release supports S3-compatible storage only.`
    );
  }

  const endpoint = firstDefined("STORAGE_S3_ENDPOINT", "R2_S3_ENDPOINT");
  const region = firstDefined("STORAGE_S3_REGION") || "auto";
  const accessKeyId = required(["STORAGE_S3_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID"]);
  const secretAccessKey = required([
    "STORAGE_S3_SECRET_ACCESS_KEY",
    "R2_SECRET_ACCESS_KEY",
  ]);

  cachedConfig = {
    bucket: required(["STORAGE_S3_BUCKET", "R2_BUCKET_NAME"]),
    publicUrl: required(["STORAGE_PUBLIC_URL", "R2_PUBLIC_URL"]).replace(/\/+$/, ""),
    client: new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: booleanEnv("STORAGE_S3_FORCE_PATH_STYLE", false),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };

  return cachedConfig;
}

export function objectKeyForDocument(ownerId: string): string {
  return `documents/${ownerId}/${crypto.randomUUID()}.enc`;
}

export function objectKeyForAvatar(userId: string, ext: string): string {
  return `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
}

export function publicUrlFor(key: string): string {
  return `${getConfig().publicUrl}/${key}`;
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresIn = 120
): Promise<string> {
  const { client, bucket } = getConfig();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
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
  const { client, bucket } = getConfig();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
