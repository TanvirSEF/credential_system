export const MAX_ENCRYPTED_PAYLOAD_CHARS = 1_500_000
export const MAX_DOCUMENT_CIPHERTEXT_BYTES = 50 * 1024 * 1024 + 16
export const MAX_DOCUMENT_METADATA_CHARS = 128 * 1024
export const MAX_DEFAULT_CREDENTIAL_TYPES = 100

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

export function validateEncryptedPayload(
  ciphertext: unknown,
  iv: unknown,
  label = "Encrypted payload",
  maxCiphertextChars = MAX_ENCRYPTED_PAYLOAD_CHARS
): string | null {
  if (
    typeof ciphertext !== "string" ||
    ciphertext.length === 0 ||
    ciphertext.length > maxCiphertextChars ||
    !BASE64URL_PATTERN.test(ciphertext)
  ) {
    return `${label} is invalid or exceeds the allowed size.`
  }
  if (
    typeof iv !== "string" ||
    iv.length < 16 ||
    iv.length > 64 ||
    !BASE64URL_PATTERN.test(iv)
  ) {
    return `${label} IV is invalid.`
  }
  return null
}

export function validateVersion(version: unknown): string | null {
  return Number.isSafeInteger(version) && Number(version) >= 1
    ? null
    : "Record version is invalid. Refresh and try again."
}

export function validateDocumentDetails(input: {
  ciphertextSize: unknown
  ciphertextSha256: unknown
  metadataCiphertext: unknown
  metadataIv: unknown
}): string | null {
  if (
    !Number.isSafeInteger(input.ciphertextSize) ||
    Number(input.ciphertextSize) < 17 ||
    Number(input.ciphertextSize) > MAX_DOCUMENT_CIPHERTEXT_BYTES
  ) {
    return "Encrypted document size is invalid or exceeds the 50 MB limit."
  }
  if (
    typeof input.ciphertextSha256 !== "string" ||
    !SHA256_HEX_PATTERN.test(input.ciphertextSha256)
  ) {
    return "Encrypted document checksum is invalid."
  }
  return validateEncryptedPayload(
    input.metadataCiphertext,
    input.metadataIv,
    "Encrypted document metadata",
    MAX_DOCUMENT_METADATA_CHARS
  )
}

export function validateDocumentSize(ciphertextSize: unknown): string | null {
  return Number.isSafeInteger(ciphertextSize) &&
    Number(ciphertextSize) >= 17 &&
    Number(ciphertextSize) <= MAX_DOCUMENT_CIPHERTEXT_BYTES
    ? null
    : "Encrypted document size is invalid or exceeds the 50 MB limit."
}

export function validateKeyEnvelope(
  envelope: KeyEnvelope,
  label: string
): string | null {
  const wrappedKeyError = validateEncryptedPayload(
    envelope?.wrappedKey,
    envelope?.iv,
    label,
    1024
  )
  if (wrappedKeyError) return wrappedKeyError
  if (
    typeof envelope.salt !== "string" ||
    envelope.salt.length < 16 ||
    envelope.salt.length > 128 ||
    !BASE64URL_PATTERN.test(envelope.salt)
  ) {
    return `${label} salt is invalid.`
  }
  if (
    envelope.kdfName !== "pbkdf2" ||
    envelope.kdfParams?.name !== "pbkdf2" ||
    envelope.kdfParams.hash !== "SHA-256" ||
    !Number.isSafeInteger(envelope.kdfParams.iterations) ||
    envelope.kdfParams.iterations < 100_000 ||
    envelope.kdfParams.iterations > 2_000_000 ||
    envelope.cryptoVersion !== 1
  ) {
    return `${label} KDF parameters are invalid.`
  }
  if (
    Boolean(envelope.verificationCiphertext) !==
    Boolean(envelope.verificationIv)
  ) {
    return `${label} verification data is incomplete.`
  }
  if (envelope.verificationCiphertext && envelope.verificationIv) {
    return validateEncryptedPayload(
      envelope.verificationCiphertext,
      envelope.verificationIv,
      `${label} verification`,
      4096
    )
  }
  return null
}
import type { KeyEnvelope } from "@/lib/crypto/types"
