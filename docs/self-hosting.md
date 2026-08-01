# Self-hosting Secure Personal Vault

## Supported provider combinations

| Capability | Supported now | Notes |
| --- | --- | --- |
| Authentication | Supabase Auth | Required by the current account and session flows. |
| Application database | PostgreSQL-compatible services | Supabase Postgres, local PostgreSQL, Neon, RDS, and similar services work. |
| Object storage | S3-compatible services | Cloudflare R2, AWS S3, MinIO, Backblaze B2, Wasabi, and similar services work. |

MongoDB is not a configuration-only replacement. Supporting it requires a separate
repository implementation, indexes and migrations, and authorization tests.

## Database modes

`DATABASE_AUTHORIZATION_MODE=supabase-rls` uses Supabase's `authenticated` role and
`auth.uid()`. The installer applies `db/rls.sql` after migrations when requested.

`DATABASE_AUTHORIZATION_MODE=application` supports ordinary PostgreSQL. The database
must remain private because server actions enforce row ownership.

`DATABASE_SETUP_MODE=existing` performs no database writes. Use it when the schema was
already created with `pnpm db:push`. Use `DATABASE_SETUP_MODE=migrate` only for an empty
database or a database already managed by the committed migration journal.

For Supabase on a typical IPv4 VPS, set `DATABASE_URL` to the Shared Pooler session-mode
connection shown under **Connect → Session pooler**. Keep the direct database URL in
`DIRECT_URL` only for Drizzle migrations and management tools. Application runtime now
prefers `DATABASE_URL`; this prevents a direct IPv6-only endpoint from breaking vault
loading after a successful login.

## Object storage

Use the `STORAGE_S3_*` variables in `.env.example`. Set
`STORAGE_S3_FORCE_PATH_STYLE=true` for MinIO. The endpoint must be reachable by users'
browsers because encrypted files upload and download directly through presigned URLs.
Legacy `R2_*` variables remain supported for existing deployments.

### Cloudflare R2 browser CORS

Presigned URLs authenticate an upload or download, but browsers still require the R2
bucket to allow the application's exact origin. In Cloudflare, open **R2 Object
Storage → your bucket → Settings → CORS Policy → Add CORS policy**, select the JSON
tab, and save a policy like this:

```json
[
  {
    "AllowedOrigins": [
      "https://vault.example.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://vault.example.com` with the deployed application origin. An origin
contains only the scheme, host, and optional port: do not add a trailing slash or URL
path. Keep localhost only when local development uses the same bucket. R2 policy
changes can take up to 30 seconds to propagate and do not require an application
redeploy.

## Interactive VPS installation

Requirements:

- Linux VPS
- Git and curl
- Docker Engine and Docker Compose v2
- Supabase project for Auth
- PostgreSQL database
- S3-compatible bucket with CORS configured for the application origin

Run:

```sh
curl -fsSL https://raw.githubusercontent.com/TanvirSEF/credential_system/main/scripts/install.sh | sudo sh
```

The installer selects the latest published GitHub Release, asks for all configuration,
creates `/opt/secure-personal-vault/.env` with mode 600, builds the image, optionally
applies migrations, and starts the service.

### Owner bootstrap

The same command asks for the owner's name, email, login password, and Supabase
service-role key. Password and service-role inputs are hidden and sent over stdin to a
one-time container process. They are never saved to `.env` or application logs.

The service-role key creates and confirms the Supabase Auth user. If that email already
exists, the supplied password must authenticate the account; the installer does not
reset it. Only its UUID is stored as `INSTANCE_OWNER_USER_ID`. Rerunning the installer
on an older installation prompts for this bootstrap only when that UUID is missing.

After installation, the owner signs in and creates a separate Master Password and
recovery key in the browser. The installer, Supabase Auth, and application server never
receive the Master Password. Every additional user has an independent login, Master
Password, recovery key, and encrypted vault.

## Release updates and visibility

Publish a semantic GitHub Release such as `v0.2.0` when an update is ready. A push to
`main` does not notify installations. The app checks the latest published release at
most once per hour and only after authenticating the user whose UUID matches
`INSTANCE_OWNER_USER_ID`.

Only that owner sees the dashboard update notice, release notes, and copy-command button.
Regular registered users on the same instance never receive infrastructure controls.

```sh
sudo sh /opt/secure-personal-vault/scripts/update.sh
```

The updater checks out the latest published release tag, rebuilds, and restarts the app
while preserving `.env`. It never deploys an unreleased `main` commit. The application
does not receive the Docker socket and cannot execute the update itself.

Terminate TLS at Dokploy, Caddy, Nginx, Traefik, or another reverse proxy. Never expose
PostgreSQL or an object-storage admin console directly to the internet.

## Dokploy

Dokploy can deploy `docker-compose.yml` directly. Configure values from `.env.example`,
expose the `app` service on port 3000, and attach a domain. Run the migration tool profile
only when using `DATABASE_SETUP_MODE=migrate`.

For a Dokploy source/Dockerfile deployment, set the Supabase values in the runtime
environment. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are the recommended
server-side names. The application also accepts the existing
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names at runtime,
so older deployments can upgrade without renaming them. Rebuild and redeploy after
changing environment values.

If Supabase Auth succeeds but the dashboard reports that the vault database is
unavailable, verify that `DATABASE_URL` uses a connection reachable from the VPS. Check
the app container logs for `Vault database status check failed`; never paste connection
strings into logs or support messages.

Dokploy does not run the interactive owner prompts. Create the owner in Supabase Auth,
copy that user's UUID into `INSTANCE_OWNER_USER_ID`, and set `APP_VERSION` to the deployed
release tag. Dokploy handles its own redeploy; the copied VPS command is intended for
installations created by `install.sh`.

## Android PWA installation

The production domain must use HTTPS. Android Chrome then offers **Install app** after
it receives `/manifest.webmanifest`, `/sw.js`, and the required launcher icons. Users
can also install or apply a waiting interface update from **Dashboard → Settings →
Android app**.

Do not configure a reverse proxy or CDN to cache `/sw.js`; the application sends
`Cache-Control: no-cache, no-store, must-revalidate` for that route. Hashed Next.js
static assets may use their normal immutable caching. The service worker intentionally
uses network-only navigation for authenticated routes and caches no vault records,
sessions, API responses, uploads, or decrypted data. When a service-worker update is
applied, the page reloads and any in-memory unlocked vault key is cleared.
