import { unwrapVaultKey, wrapVaultKey } from "./aes-gcm"
import { createKdfParams, deriveKeyFromPassword, generateSalt } from "./kdf"
import { KeyEnvelope } from "./types"
import { base64UrlToBytes, bytesToBase64Url } from "./utils"

export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()

  const groups = hex.match(/.{1,5}/g) || []
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

  const recoveryKek = await deriveKeyFromPassword(normalizedKey, salt, 100000)
  const { wrappedKey, iv } = await wrapVaultKey(vaultKey, recoveryKek)

  const kdfParams = createKdfParams(salt, 100000)

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
  } catch (err) {
    throw new Error("Invalid recovery key or corrupted recovery envelope.")
  }
}
