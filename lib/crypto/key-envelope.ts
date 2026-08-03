import {
  encryptPayload,
  decryptPayload,
  generateVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
} from "./aes-gcm"
import {
  createKdfParams,
  deriveKeyFromPassword,
  generateSalt,
  DEFAULT_PBKDF2_ITERATIONS,
} from "./kdf"
import { KeyEnvelope, VerificationPayload } from "./types"
import { base64UrlToBytes, bytesToBase64Url } from "./utils"

export async function createMasterEnvelope(
  password: string,
  vaultId?: string
): Promise<{ envelope: KeyEnvelope; vaultKey: CryptoKey }> {
  const vaultKey = await generateVaultKey()

  const envelope = await createMasterEnvelopeForVaultKey(
    password,
    vaultKey,
    vaultId
  )

  return { envelope, vaultKey }
}

export async function createMasterEnvelopeForVaultKey(
  password: string,
  vaultKey: CryptoKey,
  vaultId?: string
): Promise<KeyEnvelope> {
  const salt = generateSalt(16)
  const iterations = DEFAULT_PBKDF2_ITERATIONS

  const masterKek = await deriveKeyFromPassword(password, salt, iterations)
  const { wrappedKey, iv } = await wrapVaultKey(vaultKey, masterKek)

  const verificationPayload: VerificationPayload = {
    purpose: "vault-key-verification",
    vaultId,
    version: 1,
  }

  const verificationEncrypted = await encryptPayload(
    verificationPayload,
    vaultKey
  )
  const kdfParams = createKdfParams(salt, iterations)

  return {
    wrappedKey,
    iv,
    salt: bytesToBase64Url(salt),
    kdfName: "pbkdf2",
    kdfParams,
    verificationCiphertext: verificationEncrypted.ciphertext,
    verificationIv: verificationEncrypted.iv,
    cryptoVersion: 1,
  }
}

export async function unlockVaultWithMasterPassword(
  password: string,
  envelope: KeyEnvelope
): Promise<CryptoKey> {
  const saltBytes = base64UrlToBytes(envelope.salt)
  const iterations = envelope.kdfParams.iterations || 100000

  const masterKek = await deriveKeyFromPassword(password, saltBytes, iterations)
  const vaultKey = await unwrapVaultKey(
    envelope.wrappedKey,
    envelope.iv,
    masterKek
  )

  if (envelope.verificationCiphertext && envelope.verificationIv) {
    const verificationPayload = await decryptPayload<VerificationPayload>(
      {
        ciphertext: envelope.verificationCiphertext,
        iv: envelope.verificationIv,
        cryptoVersion: envelope.cryptoVersion,
        schemaVersion: 1,
      },
      vaultKey
    )

    if (verificationPayload.purpose !== "vault-key-verification") {
      throw new Error("Invalid master password")
    }
  }

  return vaultKey
}
