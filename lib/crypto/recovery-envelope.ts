import { unwrapVaultKey, wrapVaultKey } from "./aes-gcm"
import {
  createKdfParams,
  DEFAULT_PBKDF2_ITERATIONS,
  deriveKeyFromPassword,
  generateSalt,
} from "./kdf"
import { KeyEnvelope } from "./types"
import { base64UrlToBytes, bytesToBase64Url } from "./utils"

export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  // Crockford-style Base32 avoids visually ambiguous I/L/O/U characters while
  // preserving the full 256 bits of cryptographically random recovery entropy.
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
  let bits = 0
  let value = 0
  let encoded = ""
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      encoded += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) encoded += alphabet[(value << (5 - bits)) & 31]

  const groups = encoded.match(/.{1,4}/g) || []
  return `SPV-${groups.join("-")}`
}

export function normalizeRecoveryKey(key: string): string {
  return key
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

export async function createRecoveryEnvelope(
  rawRecoveryKey: string,
  vaultKey: CryptoKey
): Promise<KeyEnvelope> {
  const normalizedKey = normalizeRecoveryKey(rawRecoveryKey)
  const salt = generateSalt(16)

  const recoveryKek = await deriveKeyFromPassword(
    normalizedKey,
    salt,
    DEFAULT_PBKDF2_ITERATIONS
  )
  const { wrappedKey, iv } = await wrapVaultKey(vaultKey, recoveryKek)

  const kdfParams = createKdfParams(salt, DEFAULT_PBKDF2_ITERATIONS)

  return {
    wrappedKey,
    iv,
    salt: bytesToBase64Url(salt),
    kdfName: "pbkdf2",
    kdfParams,
    cryptoVersion: 1,
  }
}

export async function unlockVaultWithRecoveryKey(
  rawRecoveryKey: string,
  recoveryEnvelope: KeyEnvelope
): Promise<CryptoKey> {
  try {
    const normalizedKey = normalizeRecoveryKey(rawRecoveryKey)
    const saltBytes = base64UrlToBytes(recoveryEnvelope.salt)
    const iterations = recoveryEnvelope.kdfParams.iterations

    const recoveryKek = await deriveKeyFromPassword(
      normalizedKey,
      saltBytes,
      iterations
    )
    const vaultKey = await unwrapVaultKey(
      recoveryEnvelope.wrappedKey,
      recoveryEnvelope.iv,
      recoveryKek
    )

    return vaultKey
  } catch {
    throw new Error("Invalid recovery key or corrupted recovery envelope.")
  }
}
