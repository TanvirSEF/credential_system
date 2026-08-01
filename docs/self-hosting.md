# Self-hosting Secure Personal Vault

## Supported provider combinations

The application is intentionally split into three provider boundaries:

| Capability | Supported now | Notes |
| --- | --- | --- |
| Authentication | Supabase Auth | Required by the current session and account flows. |
| Application database | PostgreSQL-compatible services | Supabase Postgres, local PostgreSQL, Neon, RDS, and similar services work. |
| Object storage | S3-compatible services | Cloudflare R2, AWS S3, MinIO, Backblaze B2, Wasabi, and similar services work. |

MongoDB is not a configuration-only replacement. The current data model depends on
Drizzle's PostgreSQL dialect, transactions, foreign keys, and optional PostgreSQL RLS.
Supporting MongoDB requires a separate repository implementation, MongoDB indexes and
migrations, and a dedicated authorization test suite. It should be introduced as a
versioned application feature, not by translating SQL calls at runtime.

## Database authorization modes

`DATABASE_AUTHORIZATION_MODE=supabase-rls` is the strongest option when the database
provides Supabase's `authenticated` role and `auth.uid()`. Install `db/rls.sql` after
the schema migration. The installer does this automatically and the operation is
idempotent.

`DATABASE_AUTHORIZATION_MODE=application` supports ordinary PostgreSQL. The database
must not be exposed publicly: only the application server should be able to connect.
Authentication still comes from Supabase, while server actions enforce ownership in
their queries.

## Object storage configuration

Use the generic `STORAGE_S3_*` variables from `.env.example`. For MinIO, set
`STORAGE_S3_FORCE_PATH_STYLE=true`. The endpoint used to create presigned URLs must be
reachable by users' browsers, because encrypted file bytes upload and download
directly between the browser and object storage.

Existing `R2_*` variables remain accepted by the server for backward compatibility.

## Docker installation

Requirements:

- Linux VPS
- Git
- Docker Engine
- Docker Compose v2
- Supabase project for authentication
- PostgreSQL database
- S3-compatible bucket with browser CORS configured for the application origin

Run the installer as root:

```sh
curl -fsSL https://raw.githubusercontent.com/TanvirSEF/credential_system/main/scripts/install.sh | sudo sh
```

On its first run, the installer creates `/opt/secure-personal-vault/.env` and stops so
secrets can be entered safely. Run the same command again to validate the configuration,
build the image, apply migrations, and start the service.

For updates:

```sh
sudo sh /opt/secure-personal-vault/scripts/update.sh
```

The container binds to `APP_PORT` (3000 by default). Terminate TLS at Dokploy, Caddy,
Nginx, Traefik, or another reverse proxy. Never expose PostgreSQL or a MinIO admin
console directly to the internet.

## Dokploy deployment

Dokploy can deploy this repository directly with `docker-compose.yml`. Configure all
values from `.env.example` in Dokploy, expose the `app` service on port 3000, and attach
the domain there. Run the `migrate` profile/service once before the first production
start and after application upgrades.
