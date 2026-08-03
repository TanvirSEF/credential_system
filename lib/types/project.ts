export interface ProjectVariable {
  id: string
  key: string
  value: string
  secret: boolean
  enabled: boolean
  notes?: string
}

export interface ProjectEnvironment {
  id: string
  name: string
  variables: ProjectVariable[]
}

export interface DecryptedProjectPayload {
  name: string
  description?: string
  websiteUrls?: string[]
  tags?: string[]
  favorite?: boolean
  environments: ProjectEnvironment[]
}

export interface DecryptedProject {
  id: string
  vaultId: string
  ownerId: string
  deletedAt: Date | null
  payload: DecryptedProjectPayload
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CachedProjectRow {
  id: string
  vaultId: string
  payloadCiphertext: string
  iv: string
  cryptoVersion: number
  version: number
  deletedAt: Date | null
  updatedAt: Date
}
