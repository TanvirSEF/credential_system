# Secure Personal Vault (SPV)

> A self-hosted, zero-knowledge vault for passwords, API keys, secure notes,
> projects, and encrypted documents.

Secure Personal Vault encrypts vault content in the browser with the Web Crypto
API before it reaches the application server, PostgreSQL, or object storage. The
server stores encrypted payloads and key envelopes; it does not receive the
Master Password, recovery key, or decrypted vault key.

## Features

- Client-side AES-256-GCM encryption
- PBKDF2-SHA-256 key derivation with 600,000 iterations
- Passwords, API keys, custom credential types, secure notes, and projects
- Encrypted document upload to any S3-compatible object store
- Emergency recovery kit, Master Password recovery, and recovery-key rotation
- Encrypted browser-generated backup and restore archives
- Password generator, Trash recovery, and local vault search
- Security Health checks for weak, reused, old, and optionally breached passwords
- Configurable inactivity and background auto-lock controls
- Browser IndexedDB cache containing encrypted records only
- Installable Android PWA with a safe public offline fallback
- Docker, Docker Compose, Dokploy, and interactive VPS installation

## Security model

Vault encryption and decryption happen in the browser. The unlocked vault key is
kept in memory and cleared when the vault locks. Password breach checks are
opt-in and use a k-anonymity prefix; the complete password or complete hash is
not sent to the breach service.

The recovery key is the only supported way to reset a forgotten Master Password.
Store the recovery kit separately from the Master Password. If both are lost,
the encrypted vault cannot be recovered by the server or project maintainers.

This project has not undergone an independent security audit. Review the threat
model and deployment configuration before storing high-value secrets. Report
security issues privately according to [SECURITY.md](./SECURITY.md).

## Provider support

| Capability | Supported provider |
| --- | --- |
| Authentication | Supabase Auth |
| Application data | Supabase Postgres or another PostgreSQL-compatible database |
| File storage | Cloudflare R2, AWS S3, MinIO, Backblaze B2, Wasabi, or another S3-compatible service |

MongoDB is not currently supported. The schema and authorization model rely on
PostgreSQL transactions, foreign keys, Drizzle's PostgreSQL dialect, and optional
Supabase Row Level Security.

See the [self-hosting guide](./docs/self-hosting.md) for provider configuration,
Docker and Dokploy deployment, database modes, object-storage CORS, and update
operations. See the [database guide](./docs/database-migration-guide.md) before
initializing or migrating production data.

## VPS quick start

Requirements: a Linux VPS with Git, curl, Docker Engine, and Docker Compose v2.

```bash
curl -fsSL https://raw.githubusercontent.com/TanvirSEF/credential_system/main/scripts/install.sh | sudo sh
```

The installer selects the latest published GitHub Release, collects the Supabase,
PostgreSQL, S3, and owner-account configuration, and starts the application. The
owner login password and Supabase service-role key are hidden and used only by a
one-time account bootstrap process. They are not written to `.env` or application
logs.

After installation, sign in and create a separate Master Password and recovery
kit in the browser. Verify the deployment at
`http://YOUR_VPS_IP:3000/api/health`, then configure HTTPS through Dokploy,
Caddy, Nginx, Traefik, or another reverse proxy. Never expose PostgreSQL or an
object-storage administration endpoint to the public internet.

## Updating a self-hosted instance

A push to `main` does not update installations. Publish a semantic GitHub Release,
for example `v1.2.1`. Only the configured instance owner sees release notices and
the update command in the dashboard.

```bash
sudo sh /opt/secure-personal-vault/scripts/update.sh
```

The updater checks out the latest published release tag, preserves `.env`, runs
configured migrations, rebuilds the image, and restarts the application.

## Local development

Requirements: Node.js 22+, pnpm, Supabase Auth, PostgreSQL, and S3-compatible
storage.

```bash
git clone https://github.com/TanvirSEF/credential_system.git
cd credential_system
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:push
pnpm db:rls
pnpm dev
```

Use `pnpm db:rls` only with `DATABASE_AUTHORIZATION_MODE=supabase-rls`. For a
regular PostgreSQL deployment, use application authorization mode and keep the
database private.

Before submitting or releasing a change, run:

```bash
pnpm lint
pnpm typecheck
pnpm test:bootstrap
pnpm build
pnpm audit --prod --audit-level moderate
```

Open [http://localhost:3000](http://localhost:3000). Contribution guidelines are
available in [CONTRIBUTING.md](./CONTRIBUTING.md), and release history is in
[CHANGELOG.md](./CHANGELOG.md).

## Android PWA

Deploy behind HTTPS, open the application in Android Chrome, and choose
**Install app**. The service worker caches only public interface assets and the
offline explanation page. It does not cache authenticated pages, sessions,
credentials, documents, API responses, uploads, or decrypted vault content.

## License

Secure Personal Vault is distributed under the
[GNU Affero General Public License v3.0](./LICENSE).
