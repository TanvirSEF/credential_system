const BACKUP_FORMAT = "spvault-encrypted-backup"
const BACKUP_KDF_ITERATIONS = 600_000
const BACKUP_AAD = new TextEncoder().encode(`${BACKUP_FORMAT}:v1`)
export const MAX_BACKUP_FILE_BYTES = 150 * 1024 * 1024

interface EncryptedBackupEnvelope {
  format: typeof BACKUP_FORMAT
  version: 1
  createdAt: string
  kdf: {
    name: "PBKDF2"
    hash: "SHA-256"
    iterations: number
    salt: string
  }
  cipher: { name: "AES-GCM"; iv: string; ciphertext: string }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)))
  }
  return btoa(chunks.join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) base64 += "="
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function deriveBackupKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: BACKUP_KDF_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptBackupData(
  payload: unknown,
  password: string,
  createdAt = new Date().toISOString()
): Promise<Blob> {
  if (password.length < 12) {
    throw new Error("Backup password must be at least 12 characters.")
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveBackupKey(password, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      additionalData: BACKUP_AAD,
    },
    key,
    plaintext
  )
  plaintext.fill(0)
  const envelope: EncryptedBackupEnvelope = {
    format: BACKUP_FORMAT,
    version: 1,
    createdAt,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: BACKUP_KDF_ITERATIONS,
      salt: bytesToBase64Url(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
    },
  }
  return new Blob([JSON.stringify(envelope)], {
    type: "application/vnd.spvault.backup+json",
  })
}

export async function decryptBackupData(
  file: Blob,
  password: string
): Promise<unknown> {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error("Backup file exceeds the 150 MB limit.")
  }
  let envelope: EncryptedBackupEnvelope
  try {
    envelope = JSON.parse(await file.text()) as EncryptedBackupEnvelope
  } catch {
    throw new Error("This is not a valid SP Vault backup file.")
  }
  if (envelope.format !== BACKUP_FORMAT || envelope.version !== 1) {
    throw new Error("Unsupported backup format or version.")
  }
  if (
    envelope.kdf?.name !== "PBKDF2" ||
    envelope.kdf.hash !== "SHA-256" ||
    envelope.kdf.iterations !== BACKUP_KDF_ITERATIONS ||
    envelope.cipher?.name !== "AES-GCM"
  ) {
    throw new Error("Backup encryption parameters are invalid.")
  }
  try {
    const key = await deriveBackupKey(
      password,
      base64UrlToBytes(envelope.kdf.salt)
    )
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(envelope.cipher.iv) as BufferSource,
        additionalData: BACKUP_AAD,
      },
      key,
      base64UrlToBytes(envelope.cipher.ciphertext) as BufferSource
    )
    return JSON.parse(new TextDecoder().decode(decrypted)) as unknown
  } catch {
    throw new Error("Backup password is incorrect or the archive is corrupted.")
  }
}
