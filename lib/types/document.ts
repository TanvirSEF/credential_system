export interface DecryptedDocumentMetadata {
  originalName: string
  mimeType: string
  plaintextSize: number
  description?: string
  wrappedFileKey: string
  fileKeyIv: string
  fileIv: string
  tags?: string[]
}

export interface DecryptedDocument {
  id: string
  vaultId: string
  ownerId: string
  credentialId: string | null
  storagePath: string
  ciphertextSha256: string | null
  ciphertextSize: number
  uploadStatus: string
  deletedAt: Date | null
  metadata: DecryptedDocumentMetadata
  createdAt: Date
  updatedAt: Date
}
