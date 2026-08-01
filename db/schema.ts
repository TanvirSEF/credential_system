import {
  bigint,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// 1. User Profiles Table
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // Matches auth.users(id) in Supabase
  displayName: text("display_name"),
  avatarPath: text("avatar_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Vaults Table
export const vaults = pgTable("vaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  nameCiphertext: text("name_ciphertext").notNull(),
  nameIv: text("name_iv").notNull(),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Vault Key Envelopes Table (Master & Recovery Key Envelopes)
export const vaultKeyEnvelopes = pgTable("vault_key_envelopes", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" })
    .notNull(),
  ownerId: uuid("owner_id").notNull(),
  envelopeType: text("envelope_type").notNull(), // 'master' | 'recovery'
  wrappedKey: text("wrapped_key").notNull(),
  iv: text("iv").notNull(),
  salt: text("salt").notNull(),
  kdfName: text("kdf_name").notNull(), // 'argon2id' | 'pbkdf2'
  kdfParams: jsonb("kdf_params").notNull(),
  verificationCiphertext: text("verification_ciphertext"),
  verificationIv: text("verification_iv"),
  cryptoVersion: integer("crypto_version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Credential Types Table (Hierarchical Category Templates)
export const credentialTypes = pgTable(
  "credential_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaultId: uuid("vault_id")
      .references(() => vaults.id, { onDelete: "cascade" })
      .notNull(),
    ownerId: uuid("owner_id").notNull(),
    parentId: uuid("parent_id"),
    payloadCiphertext: text("payload_ciphertext").notNull(),
    iv: text("iv").notNull(),
    cryptoVersion: integer("crypto_version").default(1).notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "credential_types_parent_id_fk",
    }),
  ]
);

// 5. Credentials Table
export const credentials = pgTable("credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" })
    .notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Documents Table
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" })
    .notNull(),
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
  uploadStatus: text("upload_status").default("pending").notNull(), // 'pending' | 'completed' | 'failed'
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Devices Table
export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  deviceName: text("device_name"),
  deviceFingerprintHash: text("device_fingerprint_hash"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// 8. Audit Events Table
export const auditEvents = pgTable("audit_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  ownerId: uuid("owner_id").notNull(),
  eventType: text("event_type").notNull(),
  targetKind: text("target_kind"),
  targetId: uuid("target_id"),
  deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Sync Tombstones Table
export const syncTombstones = pgTable("sync_tombstones", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  ownerId: uuid("owner_id").notNull(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" })
    .notNull(),
  entityType: text("entity_type").notNull(), // 'credential' | 'credential_type' | 'document'
  entityId: uuid("entity_id").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).defaultNow().notNull(),
});
