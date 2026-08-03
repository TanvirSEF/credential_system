export interface KdfParams {
  name: "pbkdf2" | "argon2id"
  salt: string
  iterations: number
  hash: "SHA-256"
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  cryptoVersion: number
  schemaVersion: number
}

export interface KeyEnvelope {
  wrappedKey: string
  iv: string
  salt: string
  kdfName: string
  kdfParams: KdfParams
  verificationCiphertext?: string
  verificationIv?: string
  cryptoVersion: number
}

export interface VerificationPayload {
  purpose: string
  vaultId?: string
  version: number
}
