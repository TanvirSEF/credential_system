# Secure Personal Vault (SPV)

> Zero-knowledge encrypted password, API key, and document manager.

Secure Personal Vault encrypts data in the browser with the Web Crypto API before it
reaches the database, object storage, or application server.

## Features

- Client-side AES-256-GCM encryption
- PBKDF2 key derivation with 600,000 iterations
- Credentials, API keys, custom categories, and encrypted documents
- Recovery key support and browser IndexedDB cache
- Supabase Auth with PostgreSQL application data
- S3-compatible storage: Cloudflare R2, AWS S3, MinIO, Backblaze B2, Wasabi, and others
- Installable Android PWA with maskable icons, standalone mode, and safe offline fallback
- Docker, Docker Compose, Dokploy, and one-command VPS installation

## Provider support

- **Authentication:** Supabase Auth
- **Application data:** Supabase Postgres or another PostgreSQL-compatible database
- **File storage:** any S3-compatible service

MongoDB is not currently supported. The schema and authorization model rely on
PostgreSQL transactions, foreign keys, Drizzle's PostgreSQL dialect, and optional RLS.

See [the self-hosting guide](./docs/self-hosting.md) for provider details, Docker and
Dokploy deployment, database modes, Cloudflare R2 browser CORS, security requirements,
and updates.

## VPS quick start

Requirements: a Linux VPS with Git, curl, Docker Engine, and Docker Compose v2.

```bash
curl -fsSL https://raw.githubusercontent.com/TanvirSEF/credential_system/main/scripts/install.sh | sudo sh
```

The first run installs the latest published GitHub Release, or the default branch when
no release exists. It asks for the Supabase, PostgreSQL, storage, and owner-account
configuration, then builds and starts the application in the same run.

The owner login password and Supabase service-role key are hidden and used only by a
one-time account bootstrap process. They are not written to `.env` or logs. Only the
created Supabase user UUID is saved as `INSTANCE_OWNER_USER_ID`.

Choose `yes` when asked whether the database schema already exists if it was previously
created using `pnpm db:push`. This skips migration and RLS writes. Choose `no` only for
an empty database or one already managed by the committed migration journal.

After installation, the owner logs in and creates a separate Master Password and
recovery key inside the browser. Every additional registered user creates an independent
Master Password and encrypted vault.

Verify the deployment at `http://YOUR_VPS_IP:3000/api/health`, then attach a domain and
HTTPS with Dokploy, Caddy, Nginx, or another reverse proxy. Never expose PostgreSQL or
an object-storage admin console directly to the internet.

## Release updates

A push to `main` does not notify installations. Publish a semantic GitHub Release such
as `v0.2.0` when an update is ready. Only the configured instance owner sees the update
notice, release notes, and copy-update-command button in the dashboard.

```bash
sudo sh /opt/secure-personal-vault/scripts/update.sh
```

The updater deploys the latest published release tag and preserves the instance `.env`.

## Install on Android

Deploy the application behind HTTPS, open it in Android Chrome, and choose
**Install app** from the in-app prompt or the browser menu. It launches in standalone
mode as **SP Vault**. Installation status and updates are also available under
**Dashboard → Settings → Android app**.

The service worker caches only public interface assets and the offline explanation
page. It never caches authenticated pages, sessions, credentials, documents, API
responses, or decrypted vault data. Opening the installed app still requires online
session verification and a Master Password unlock after the in-memory key is cleared.

## Local development

Requirements: Node.js 22+, pnpm, Supabase Auth, PostgreSQL, and S3-compatible storage.

```bash
git clone https://github.com/TanvirSEF/credential_system.git
cd credential_system
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

Distributed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE).
