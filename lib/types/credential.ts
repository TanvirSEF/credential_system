import { FieldType } from "./credential-template"

export interface CredentialField {
  id: string
  label: string
  type: FieldType
  value: string
  secret: boolean
  required?: boolean
  copyable?: boolean
  options?: string[]
}

export interface DecryptedCredentialPayload {
  title: string
  subtitle?: string
  typeId?: string
  fields: CredentialField[]
  websiteUrls?: string[]
  notes?: string
  tags?: string[]
  favorite?: boolean
  expiresAt?: string | null
}

export interface DecryptedCredential {
  id: string
  vaultId: string
  ownerId: string
  typeId: string | null
  deletedAt: Date | null
  payload: DecryptedCredentialPayload
  version: number
  createdAt: Date
  updatedAt: Date
}
