# Secure Personal Vault — Database Migration & Setup Guide

This guide provides step-by-step instructions for initializing a fresh Supabase database or migrating existing encrypted vault data to a new Supabase project without data loss.

---

## 🔑 Required Keys & Connection Matrix

Before starting, collect the following 4 keys from your Supabase Project Dashboard (**Project Settings ➔ API / Database**):

| Key Name | Description | Where to find in Supabase Dashboard | Example Value |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API Domain | **Project Settings ➔ API ➔ Project URL** | `https://kwsxuqkywddmnxhvyzuv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Anon Client Key | **Project Settings ➔ API ➔ Project API Keys (anon/public)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `POSTGRES_URL` | Transaction Connection Pooler | **Project Settings ➔ Database ➔ Connection string (Transaction, Port 6543)** | `postgres://postgres.ref:[PASS]@aws-0-region.pooler.supabase.com:6543/postgres?workaround=supabase-pooler-only` |
| `DIRECT_URL` | Direct Session Connection | **Project Settings ➔ Database ➔ Connection string (Direct, Port 5432)** | `postgres://postgres:[PASS]@db.ref.supabase.co:5432/postgres` |

---

## 📋 Table of Contents
1. [Scenario A: Fresh Database Initialization](#scenario-a-fresh-database-initialization)
2. [Scenario B: Zero-Loss Data Migration to New Database](#scenario-b-zero-loss-data-migration-to-new-database)
3. [Post-Migration Verification Checklist](#post-migration-verification-checklist)

---

## 🚀 Scenario A: Fresh Database Initialization

Use this section if you are setting up a brand new, empty Supabase project.

### Step 1: Update Environment Variables
Open your `.env` file and replace the values with your new project keys:

```env
# Supabase API Settings
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_NEW_PROJECT_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_NEW_ANON_KEY"

# Database Connections
POSTGRES_URL="postgres://postgres.[YOUR_PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?workaround=supabase-pooler-only"
DIRECT_URL="postgres://postgres:[PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres"
```

### Step 2: Push Database Schema
Run Drizzle ORM schema push to create all tables (`vaults`, `vault_key_envelopes`, `credential_types`, `credentials`, `documents`, `profiles`):
```bash
pnpm db:push
```

### Step 3: Apply Row Level Security (RLS) Policies
1. Open the [db/rls.sql](file:///c:/Users/user/Desktop/my_credentials/credentials/db/rls.sql) file in your project.
2. Copy the full contents of `db/rls.sql`.
3. Open your new Supabase Project Dashboard ➔ **SQL Editor**.
4. Paste the SQL code and click **Run**.

### Step 4: Create Storage Bucket for Encrypted Documents
1. Open Supabase Dashboard ➔ **Storage**.
2. Click **New Bucket**.
3. Set Bucket Name to exactly: `vault-files`.
4. Ensure **Public Bucket** is turned **OFF** (Keep it **Private**).
5. Click **Save**.

### Step 5: Configure Supabase Auth
1. Go to **Authentication ➔ URL Configuration**.
2. Set **Site URL** to your application URL (e.g. `http://localhost:3000` or `https://your-domain.com`).
3. Under **Redirect URLs**, add `http://localhost:3000/**` or your production domain callback URL.

---

## 📦 Scenario B: Zero-Loss Data Migration to New Database

Use this section if you have active users and encrypted data in your current database and want to migrate everything to a new Supabase project without losing any passwords, envelopes, or encrypted files.

> [!IMPORTANT]
> Zero-Knowledge Encryption relies on `auth.users.id` (UUID) matching between Supabase Auth and database ownership records (`owner_id`). Therefore, both PostgreSQL data and Supabase Auth users must be migrated together.

### 🛡️ Keys & Credentials Required for Zero-Loss Migration

To perform a zero-loss migration, gather the following 5 keys:

| Key / Credential | Purpose | Where to find |
| :--- | :--- | :--- |
| `OLD_DIRECT_URL` | Exports current database dump (Auth users + Encrypted data) | Current Supabase Dashboard ➔ **Settings ➔ Database ➔ Direct Connection (5432)** |
| `NEW_DIRECT_URL` | Restores database dump into new database | New Supabase Dashboard ➔ **Settings ➔ Database ➔ Direct Connection (5432)** |
| `OLD_PROJECT_REF` | Identifies current project for file downloads | Current Supabase Dashboard URL (e.g. `https://supabase.com/dashboard/project/kwsxuqkywddmnxhvyzuv` ➔ `kwsxuqkywddmnxhvyzuv`) |
| `NEW_PROJECT_REF` | Identifies new project for file uploads | New Supabase Dashboard URL (e.g. `https://supabase.com/dashboard/project/newrefid` ➔ `newrefid`) |
| `SUPABASE_ACCESS_TOKEN` | Authorizes Supabase CLI migration commands | Supabase Account ➔ **Account Settings ➔ Access Tokens ➔ Generate Token** |

---

### Step 1: Backup Current PostgreSQL Database
Run `pg_dump` in your terminal using your `OLD_DIRECT_URL`:

```bash
pg_dump "YOUR_OLD_DIRECT_URL" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --schema=public \
  --schema=auth \
  -f backup_vault_db.sql
```
*(This exports all tables, auth user accounts, key envelopes, credentials, and categories into `backup_vault_db.sql`.)*

### Step 2: Restore Database Backup to New Supabase Instance
Run `psql` to import the complete data dump into your new database using your `NEW_DIRECT_URL`:

```bash
psql "YOUR_NEW_DIRECT_URL" -f backup_vault_db.sql
```

### Step 3: Migrate Storage Objects (`vault-files` Bucket)
If users have uploaded encrypted document files, transfer storage blobs:

1. Log in to Supabase CLI with your Access Token:
   ```bash
   export SUPABASE_ACCESS_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"
   ```
2. Sync storage files from old project bucket to local machine:
   ```bash
   npx supabase storage download vault-files ./storage_backup --project-ref OLD_PROJECT_REF
   ```
3. Upload storage files to new project bucket:
   ```bash
   npx supabase storage upload vault-files ./storage_backup --project-ref NEW_PROJECT_REF
   ```

### Step 4: Re-Apply Security Policies
Execute the RLS policy script on the new database:
```bash
# Run contents of db/rls.sql in Supabase SQL Editor
```

---

## ✅ Post-Migration Verification Checklist

After completing the migration:

1. **Test User Authentication**: Sign in with an existing user account.
2. **Test Master Password Unlock**: Enter your master password to verify PBKDF2 envelope unwrapping.
3. **Test Decryption**: Confirm encrypted credentials and custom category types decrypt cleanly in memory.
4. **Test Document Download**: Download and decrypt a test file from the Document Vault.
5. **Verify Security Headers**: Inspect Network tab response headers for `Content-Security-Policy` and `X-Frame-Options: DENY`.
