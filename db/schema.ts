import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  bigint,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  phoneNumber: text("phone_number"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const vaults = pgTable("vaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  nameCiphertext: text("name_ciphertext").notNull(),
  nameIv: text("name_iv").notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const vaultKeyEnvelopes = pgTable(
  "vault_key_envelopes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").notNull(),
    envelopeType: text("envelope_type").notNull(),
    wrappedKey: text("wrapped_key").notNull(),
    iv: text("iv").notNull(),
    salt: text("salt").notNull(),
    kdfName: text("kdf_name").notNull(),
    kdfParams: jsonb("kdf_params").notNull(),
    verificationCiphertext: text("verification_ciphertext"),
    verificationIv: text("verification_iv"),
    cryptoVersion: integer("crypto_version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("vault_key_envelopes_vault_type_unique").on(
      table.vaultId,
      table.envelopeType
    ),
  ]
)

export const credentialTypes = pgTable("credential_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull(),
  parentId: uuid("parent_id"),
  payloadCiphertext: text("payload_ciphertext").notNull(),
  iv: text("iv").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  version: integer("version").default(1).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const credentials = pgTable("credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull(),
  typeId: uuid("type_id").references(() => credentialTypes.id, {
    onDelete: "set null",
  }),
  payloadCiphertext: text("payload_ciphertext").notNull(),
  iv: text("iv").notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  version: integer("version").default(1).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull(),
  payloadCiphertext: text("payload_ciphertext").notNull(),
  iv: text("iv").notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  version: integer("version").default(1).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull(),
  payloadCiphertext: text("payload_ciphertext").notNull(),
  iv: text("iv").notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  schemaVersion: integer("schema_version").default(1).notNull(),
  version: integer("version").default(1).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull(),
  credentialId: uuid("credential_id").references(() => credentials.id, {
    onDelete: "set null",
  }),
  storagePath: text("storage_path").notNull(),
  metadataCiphertext: text("metadata_ciphertext").notNull(),
  metadataIv: text("metadata_iv").notNull(),
  ciphertextSha256: text("ciphertext_sha256"),
  ciphertextSize: bigint("ciphertext_size", { mode: "number" }).notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  version: integer("version").default(1).notNull(),
  uploadStatus: text("upload_status").default("pending").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
