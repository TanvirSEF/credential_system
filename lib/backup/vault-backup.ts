"use client"

import { createCredentialAction } from "@/lib/actions/credentials"
import { createCredentialTypeAction } from "@/lib/actions/credential-types"
import {
  createDocumentRecordAction,
  createDocumentUploadUrlAction,
  getDocumentDownloadUrlAction,
} from "@/lib/actions/documents"
import { createNoteAction } from "@/lib/actions/notes"
import { createProjectAction } from "@/lib/actions/projects"
import { decryptFile, encryptFile } from "@/lib/crypto/file-crypto"
import { encryptPayload } from "@/lib/crypto"
import type { DecryptedCredentialPayload } from "@/lib/types/credential"
import type { CredentialTypePayload } from "@/lib/types/credential-template"
import type { DecryptedDocumentMetadata } from "@/lib/types/document"
import type { DecryptedNotePayload } from "@/lib/types/note"
import type { DecryptedProjectPayload } from "@/lib/types/project"
import {
  loadDecryptedVaultIndex,
  type DecryptedVaultIndex,
} from "@/lib/vault/decrypted-index"
import {
  decryptBackupData,
  encryptBackupData,
  MAX_BACKUP_FILE_BYTES,
} from "./backup-crypto"

export { MAX_BACKUP_FILE_BYTES }
const MAX_BACKUP_ITEMS = 10_000
const MAX_BACKUP_DOCUMENT_BYTES = 100 * 1024 * 1024

interface BackupPayload {
  version: 1
  createdAt: string
  types: Array<{
    sourceId: string
    parentSourceId: string | null
    sortOrder: number
    payload: CredentialTypePayload
  }>
  credentials: Array<{
    sourceId: string
    typeSourceId: string | null
    payload: DecryptedCredentialPayload
  }>
  projects: Array<{ sourceId: string; payload: DecryptedProjectPayload }>
  notes: Array<{ sourceId: string; payload: DecryptedNotePayload }>
  documents: Array<{
    sourceId: string
    credentialSourceId: string | null
    metadata: Pick<
      DecryptedDocumentMetadata,
      "originalName" | "mimeType" | "plaintextSize" | "description" | "tags"
    >
    data: string
  }>
}

export interface BackupProgress {
  phase: "preparing" | "documents" | "encrypting" | "restoring"
  current: number
  total: number
  message: string
}

export interface RestoreSummary {
  created: number
  skipped: number
  documents: number
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)))
  }
  return btoa(chunks.join(""))
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function buildBackupPayload(
  index: DecryptedVaultIndex,
  vaultKey: CryptoKey,
  onProgress?: (progress: BackupProgress) => void
): Promise<BackupPayload> {
  const documents: BackupPayload["documents"] = []
  let totalDocumentBytes = 0
  for (let position = 0; position < index.documents.length; position++) {
    const document = index.documents[position]
    onProgress?.({
      phase: "documents",
      current: position + 1,
      total: index.documents.length,
      message: `Packing ${document.metadata.originalName}`,
    })
    totalDocumentBytes += document.metadata.plaintextSize
    if (totalDocumentBytes > MAX_BACKUP_DOCUMENT_BYTES) {
      throw new Error("Documents exceed the 100 MB in-browser backup limit.")
    }
    const download = await getDocumentDownloadUrlAction(document.id)
    if (download.error || !download.downloadUrl)
      throw new Error(download.error || "Document download URL failed.")
    const response = await fetch(download.downloadUrl)
    if (!response.ok)
      throw new Error(`Could not download ${document.metadata.originalName}.`)
    const plaintext = await decryptFile(
      await response.arrayBuffer(),
      document.metadata,
      vaultKey
    )
    documents.push({
      sourceId: document.id,
      credentialSourceId: document.credentialId,
      metadata: {
        originalName: document.metadata.originalName,
        mimeType: document.metadata.mimeType,
        plaintextSize: document.metadata.plaintextSize,
        description: document.metadata.description,
        tags: document.metadata.tags,
      },
      data: arrayBufferToBase64(await plaintext.arrayBuffer()),
    })
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    types: index.types.map((item) => ({
      sourceId: item.id,
      parentSourceId: item.parentId,
      sortOrder: item.sortOrder,
      payload: item.payload,
    })),
    credentials: index.credentials.map((item) => ({
      sourceId: item.id,
      typeSourceId: item.typeId,
      payload: item.payload,
    })),
    projects: index.projects.map((item) => ({
      sourceId: item.id,
      payload: item.payload,
    })),
    notes: index.notes.map((item) => ({
      sourceId: item.id,
      payload: item.payload,
    })),
    documents,
  }
}

export async function exportVaultBackup(
  vaultId: string,
  vaultKey: CryptoKey,
  backupPassword: string,
  onProgress?: (progress: BackupProgress) => void
): Promise<Blob> {
  if (backupPassword.length < 12)
    throw new Error("Backup password must be at least 12 characters.")
  onProgress?.({
    phase: "preparing",
    current: 0,
    total: 1,
    message: "Decrypting active vault items",
  })
  const index = await loadDecryptedVaultIndex(vaultId, vaultKey)
  const payload = await buildBackupPayload(index, vaultKey, onProgress)
  onProgress?.({
    phase: "encrypting",
    current: 1,
    total: 1,
    message: "Encrypting backup archive",
  })

  return encryptBackupData(payload, backupPassword, payload.createdAt)
}

function assertBackupPayload(value: unknown): asserts value is BackupPayload {
  if (!value || typeof value !== "object")
    throw new Error("Backup payload is invalid.")
  const payload = value as Partial<BackupPayload>
  if (payload.version !== 1)
    throw new Error("Unsupported backup payload version.")
  const collections = [
    payload.types,
    payload.credentials,
    payload.projects,
    payload.notes,
    payload.documents,
  ]
  if (collections.some((collection) => !Array.isArray(collection)))
    throw new Error("Backup collections are invalid.")
  const validSourceId = (item: unknown) =>
    Boolean(
      item &&
      typeof item === "object" &&
      typeof (item as { sourceId?: unknown }).sourceId === "string"
    )
  if (
    !(payload.types || []).every(
      (item) =>
        validSourceId(item) &&
        typeof item.payload?.name === "string" &&
        Array.isArray(item.payload.fields) &&
        (item.parentSourceId === null ||
          typeof item.parentSourceId === "string")
    ) ||
    !(payload.credentials || []).every(
      (item) =>
        validSourceId(item) &&
        typeof item.payload?.title === "string" &&
        Array.isArray(item.payload.fields) &&
        item.payload.fields.every(
          (field) =>
            typeof field?.id === "string" &&
            typeof field.label === "string" &&
            typeof field.value === "string"
        )
    ) ||
    !(payload.projects || []).every(
      (item) =>
        validSourceId(item) &&
        typeof item.payload?.name === "string" &&
        Array.isArray(item.payload.environments)
    ) ||
    !(payload.notes || []).every(
      (item) =>
        validSourceId(item) &&
        typeof item.payload?.title === "string" &&
        typeof item.payload.content === "string"
    ) ||
    !(payload.documents || []).every(
      (item) =>
        validSourceId(item) &&
        typeof item.metadata?.originalName === "string" &&
        typeof item.metadata.mimeType === "string" &&
        Number.isSafeInteger(item.metadata.plaintextSize) &&
        item.metadata.plaintextSize >= 0 &&
        typeof item.data === "string"
    )
  ) {
    throw new Error("Backup item structure is invalid.")
  }
  const itemCount = collections.reduce(
    (total, collection) => total + (collection?.length || 0),
    0
  )
  if (itemCount > MAX_BACKUP_ITEMS)
    throw new Error("Backup contains too many items.")
  const documentBytes = (payload.documents || []).reduce(
    (total, item) => total + Number(item?.metadata?.plaintextSize || 0),
    0
  )
  if (
    !Number.isSafeInteger(documentBytes) ||
    documentBytes > MAX_BACKUP_DOCUMENT_BYTES
  )
    throw new Error("Backup documents exceed the restore limit.")
}

export async function decryptVaultBackup(
  file: File,
  backupPassword: string
): Promise<BackupPayload> {
  const payload = await decryptBackupData(file, backupPassword)
  assertBackupPayload(payload)
  return payload
}

function normalized(value: string | undefined): string {
  return (value || "").trim().toLowerCase()
}

export async function restoreVaultBackup(
  payload: BackupPayload,
  vaultId: string,
  vaultKey: CryptoKey,
  onProgress?: (progress: BackupProgress) => void
): Promise<RestoreSummary> {
  const existing = await loadDecryptedVaultIndex(vaultId, vaultKey)
  let created = 0
  let skipped = 0
  let restoredDocuments = 0
  const total =
    payload.types.length +
    payload.credentials.length +
    payload.projects.length +
    payload.notes.length +
    payload.documents.length
  let current = 0
  const report = (message: string) =>
    onProgress?.({ phase: "restoring", current: ++current, total, message })

  const typeMap = new Map<string, string>()
  const existingTypeByName = new Map(
    existing.types.map((item) => [normalized(item.payload.name), item.id])
  )
  const pendingTypes = [...payload.types]
  while (pendingTypes.length) {
    const readyIndex = pendingTypes.findIndex(
      (item) =>
        !item.parentSourceId ||
        typeMap.has(item.parentSourceId) ||
        !payload.types.some(
          (candidate) => candidate.sourceId === item.parentSourceId
        )
    )
    const item = pendingTypes.splice(readyIndex < 0 ? 0 : readyIndex, 1)[0]
    const matchingId = existingTypeByName.get(normalized(item.payload.name))
    if (matchingId) {
      typeMap.set(item.sourceId, matchingId)
      skipped++
    } else {
      const encrypted = await encryptPayload(item.payload, vaultKey)
      const result = await createCredentialTypeAction({
        vaultId,
        parentId: item.parentSourceId
          ? typeMap.get(item.parentSourceId)
          : undefined,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        sortOrder: item.sortOrder,
      })
      if (result.error || !("newType" in result) || !result.newType)
        throw new Error(result.error || "Category restore failed.")
      typeMap.set(item.sourceId, result.newType.id)
      existingTypeByName.set(normalized(item.payload.name), result.newType.id)
      created++
    }
    report(`Category: ${item.payload.name}`)
  }

  const credentialMap = new Map<string, string>()
  const credentialKeys = new Map(
    existing.credentials.map((item) => [
      `${normalized(item.payload.title)}|${normalized(item.payload.subtitle)}`,
      item.id,
    ])
  )
  for (const item of payload.credentials) {
    const duplicateKey = `${normalized(item.payload.title)}|${normalized(item.payload.subtitle)}`
    const matchingId = credentialKeys.get(duplicateKey)
    if (matchingId) {
      credentialMap.set(item.sourceId, matchingId)
      skipped++
    } else {
      const restoredTypeId = item.typeSourceId
        ? typeMap.get(item.typeSourceId)
        : undefined
      const restoredPayload = {
        ...item.payload,
        typeId: restoredTypeId,
      }
      const encrypted = await encryptPayload(restoredPayload, vaultKey)
      const result = await createCredentialAction({
        vaultId,
        typeId: restoredTypeId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      if (result.error || !("newCredential" in result) || !result.newCredential)
        throw new Error(result.error || "Credential restore failed.")
      credentialMap.set(item.sourceId, result.newCredential.id)
      credentialKeys.set(duplicateKey, result.newCredential.id)
      created++
    }
    report(`Credential: ${item.payload.title}`)
  }

  const projectNames = new Set(
    existing.projects.map((item) => normalized(item.payload.name))
  )
  for (const item of payload.projects) {
    if (projectNames.has(normalized(item.payload.name))) skipped++
    else {
      const encrypted = await encryptPayload(item.payload, vaultKey)
      const result = await createProjectAction({
        vaultId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      if (result.error) throw new Error(result.error)
      projectNames.add(normalized(item.payload.name))
      created++
    }
    report(`Project: ${item.payload.name}`)
  }

  const noteNames = new Set(
    existing.notes.map((item) => normalized(item.payload.title))
  )
  for (const item of payload.notes) {
    if (noteNames.has(normalized(item.payload.title))) skipped++
    else {
      const encrypted = await encryptPayload(item.payload, vaultKey)
      const result = await createNoteAction({
        vaultId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      if (result.error) throw new Error(result.error)
      noteNames.add(normalized(item.payload.title))
      created++
    }
    report(`Note: ${item.payload.title}`)
  }

  const documentKeys = new Set(
    existing.documents.map(
      (item) =>
        `${normalized(item.metadata.originalName)}|${item.metadata.plaintextSize}`
    )
  )
  for (const item of payload.documents) {
    const duplicateKey = `${normalized(item.metadata.originalName)}|${item.metadata.plaintextSize}`
    if (documentKeys.has(duplicateKey)) skipped++
    else {
      const bytes = base64ToBytes(item.data)
      if (bytes.byteLength !== item.metadata.plaintextSize)
        throw new Error(`Document size mismatch: ${item.metadata.originalName}`)
      const file = new File([bytes as BlobPart], item.metadata.originalName, {
        type: item.metadata.mimeType,
      })
      const encrypted = await encryptFile(
        file,
        vaultKey,
        item.metadata.description
      )
      const upload = await createDocumentUploadUrlAction(
        vaultId,
        encrypted.ciphertextSize
      )
      if (upload.error || !upload.uploadUrl || !upload.storagePath)
        throw new Error(upload.error || "Document upload preparation failed.")
      const uploadResponse = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: encrypted.ciphertextBuffer,
      })
      if (!uploadResponse.ok)
        throw new Error(`Storage rejected ${item.metadata.originalName}.`)
      const record = await createDocumentRecordAction({
        vaultId,
        credentialId: item.credentialSourceId
          ? credentialMap.get(item.credentialSourceId)
          : undefined,
        storagePath: upload.storagePath,
        metadataCiphertext: encrypted.metadataCiphertext,
        metadataIv: encrypted.metadataIv,
        ciphertextSha256: encrypted.ciphertextSha256,
        ciphertextSize: encrypted.ciphertextSize,
      })
      if (record.error) throw new Error(record.error)
      documentKeys.add(duplicateKey)
      created++
      restoredDocuments++
    }
    report(`Document: ${item.metadata.originalName}`)
  }
  return { created, skipped, documents: restoredDocuments }
}
