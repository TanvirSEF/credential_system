import { base64UrlToBytes, bytesToBase64Url, bytesToString, stringToBytes } from "./utils";
import { EncryptedPayload } from "./types";

export async function generateVaultKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

export function generateIv(length = 12): Uint8Array {
  const iv = new Uint8Array(length);
  crypto.getRandomValues(iv);
  return iv;
}

export async function encryptPayload<T extends object>(
  payloadData: T,
  vaultKey: CryptoKey,
  aad?: string
): Promise<EncryptedPayload> {
  const iv = generateIv(12);
  const jsonText = JSON.stringify(payloadData);
  const dataBytes = stringToBytes(jsonText);

  const algorithmParams: AesGcmParams = {
    name: "AES-GCM",
    iv: iv as BufferSource,
  };

  if (aad) {
    algorithmParams.additionalData = stringToBytes(aad) as BufferSource;
  }

  const ciphertextBuffer = await crypto.subtle.encrypt(
    algorithmParams,
    vaultKey,
    dataBytes as BufferSource
  );

  return {
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64Url(iv),
    cryptoVersion: 1,
    schemaVersion: 1,
  };
}

export async function decryptPayload<T = unknown>(
  encrypted: EncryptedPayload,
  vaultKey: CryptoKey,
  aad?: string
): Promise<T> {
  const ivBytes = base64UrlToBytes(encrypted.iv);
  const ciphertextBytes = base64UrlToBytes(encrypted.ciphertext);

  const algorithmParams: AesGcmParams = {
    name: "AES-GCM",
    iv: ivBytes as BufferSource,
  };

  if (aad) {
    algorithmParams.additionalData = stringToBytes(aad) as BufferSource;
  }

  const decryptedBuffer = await crypto.subtle.decrypt(
    algorithmParams,
    vaultKey,
    ciphertextBytes as BufferSource
  );

  const jsonText = bytesToString(new Uint8Array(decryptedBuffer));
  return JSON.parse(jsonText) as T;
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKey: string; iv: string }> {
  const iv = generateIv(12);
  const rawKeyBuffer = await crypto.subtle.exportKey("raw", vaultKey);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    wrappingKey,
    rawKeyBuffer
  );

  return {
    wrappedKey: bytesToBase64Url(new Uint8Array(encryptedBuffer)),
    iv: bytesToBase64Url(iv),
  };
}

export async function unwrapVaultKey(
  wrappedKeyData: string,
  ivData: string,
  unwrappingKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBytes = base64UrlToBytes(wrappedKeyData);
  const ivBytes = base64UrlToBytes(ivData);

  const decryptedRawBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes as BufferSource },
    unwrappingKey,
    wrappedBytes as BufferSource
  );

  return await crypto.subtle.importKey(
    "raw",
    decryptedRawBuffer,
    "AES-GCM",
    false,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}
