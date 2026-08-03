# Database setup and migration guide

This guide covers fresh PostgreSQL setup, upgrades of an existing Secure Personal
Vault database, and the safety requirements for moving a deployment to a new
provider.

## Before you begin

Back up the database and S3 bucket before changing a production deployment. Test
the backup by restoring it into an isolated environment. Never paste connection
strings, service-role keys, database dumps, or decrypted vault data into an issue
or support message.

The application uses these database settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime PostgreSQL connection. For Supabase on an IPv4 VPS, normally use the Shared Pooler session-mode URL. |
| `DIRECT_URL` | Optional direct connection used by Drizzle migration tools. |
| `DATABASE_SETUP_MODE` | `existing` when the schema is already managed; `migrate` for an empty database or one already using the committed migration journal. |
| `DATABASE_AUTHORIZATION_MODE` | `supabase-rls` for Supabase RLS, or `application` for a private regular PostgreSQL database. |

Copy `.env.example` to `.env` and fill in the real values. Do not commit `.env`.

## Fresh database

### Option A: local development or an existing managed database

Use Drizzle schema push when creating a development database or when you have
chosen to manage schema changes outside the committed migration journal:

```bash
pnpm db:push
```

If `DATABASE_AUTHORIZATION_MODE=supabase-rls`, apply the committed policies:

```bash
pnpm db:rls
```

Set `DATABASE_SETUP_MODE=existing` after setup so the installer or updater does
not attempt to replay migrations against a database created with schema push.

### Option B: committed migrations

Use this only for an empty database or a database already managed by the files in
`db/migrations`:

```bash
pnpm db:migrate
pnpm db:rls
```

Set `DATABASE_SETUP_MODE=migrate`. The RLS command automatically skips policy
installation in application authorization mode.

The current schema includes profiles, vaults, Master Password and recovery key
envelopes, credential types, credentials, projects, notes, and encrypted document
metadata. Encrypted document blobs are stored separately in the configured S3
bucket.

## Upgrade an existing instance

The supported VPS updater checks out a published release, preserves `.env`, and
runs the configured migration flow:

```bash
sudo sh /opt/secure-personal-vault/scripts/update.sh
```

Before running it:

1. Create a PostgreSQL backup and an S3 object backup.
2. Confirm whether the deployment uses `existing` or `migrate` setup mode.
3. Read the target release notes and `CHANGELOG.md`.
4. Verify that the current application is healthy at `/api/health`.

Do not switch an established `db:push` database to migration mode without first
baselining its migration journal. Replaying the initial migration against existing
tables can fail or produce an inconsistent history.

## Move to another provider

A complete move has three independent parts:

1. **Supabase Auth:** preserve every user's UUID. Database ownership fields use
   the same UUID, so creating replacement users with different IDs breaks access.
2. **PostgreSQL:** move the application tables, constraints, indexes, migration
   journal when used, and RLS policies when applicable.
3. **S3-compatible storage:** copy every encrypted object while preserving its
   object key. Configure browser CORS for the new application origin.

Use the source and destination providers' supported backup/restore tools. For
PostgreSQL this normally means `pg_dump` and `pg_restore` run by an operator with
appropriate privileges. Supabase-managed schemas, including Auth, may require a
provider-specific migration procedure; do not assume a public-schema dump includes
them.

After the copy, update `DATABASE_URL`, `DIRECT_URL`, the Supabase settings, and all
`STORAGE_S3_*` values. Keep the old services read-only and available until the new
deployment passes verification.

## Verification checklist

- `/api/health` reports a healthy application and database connection.
- An existing user can sign in and unlock with the current Master Password.
- The saved recovery key can start the recovery flow without changing production
  data; complete this check in a restored staging environment when possible.
- Credentials, custom types, notes, and projects decrypt correctly.
- Encrypted documents upload, download, and decrypt correctly.
- Trash restore, encrypted backup export, and backup restore work in staging.
- A second user cannot read or mutate another user's rows.
- Supabase RLS policies are installed when using `supabase-rls` mode.
- The S3 bucket allows only the required browser origin and methods.
- Response headers include the configured Content Security Policy and frame
  protection.

Only decommission the old database and object store after the new deployment and
its backups have been verified.
