import { base64UrlToBytes, bytesToBase64Url, stringToBytes } from "./utils"
import { KdfParams } from "./types"

export const DEFAULT_PBKDF2_ITERATIONS = 600000

export function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length)
  crypto.getRandomValues(salt)
  return salt
}

export async function deriveKeyFromPassword(
  password: string,
  saltBytes: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const passwordBytes = stringToBytes(password)

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  )

  return derivedKey
}

export function createKdfParams(
  saltBytes: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): KdfParams {
  return {
    name: "pbkdf2",
    salt: bytesToBase64Url(saltBytes),
    iterations,
    hash: "SHA-256",
  }
}
