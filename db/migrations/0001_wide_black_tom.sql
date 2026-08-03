-- Bring the migration history in line with the existing application schema.
-- Every statement is idempotent because some deployed instances were created
-- with `drizzle-kit push` before this migration was generated.
CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"payload_ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"crypto_version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"payload_ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"crypto_version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credential_types"
	ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
DO $migration$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'notes_vault_id_vaults_id_fk'
			AND conrelid = 'public.notes'::regclass
	) THEN
		ALTER TABLE "notes" ADD CONSTRAINT "notes_vault_id_vaults_id_fk"
			FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id")
			ON DELETE cascade ON UPDATE no action;
	END IF;
END
$migration$;
--> statement-breakpoint
DO $migration$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'projects_vault_id_vaults_id_fk'
			AND conrelid = 'public.projects'::regclass
	) THEN
		ALTER TABLE "projects" ADD CONSTRAINT "projects_vault_id_vaults_id_fk"
			FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id")
			ON DELETE cascade ON UPDATE no action;
	END IF;
END
$migration$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vault_key_envelopes_vault_type_unique"
	ON "vault_key_envelopes" USING btree ("vault_id", "envelope_type");
