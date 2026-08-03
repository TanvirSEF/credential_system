export interface DecryptedNotePayload {
  title: string
  content: string
  tags?: string[]
  favorite?: boolean
}

export interface DecryptedNote {
  id: string
  vaultId: string
  ownerId: string
  deletedAt: Date | null
  payload: DecryptedNotePayload
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CachedNoteRow {
  id: string
  vaultId: string
  payloadCiphertext: string
  iv: string
  cryptoVersion: number
  version: number
  deletedAt: Date | null
  updatedAt: Date
}
