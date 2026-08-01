# 🛡️ Secure Personal Vault (SPV)

> **Zero-Knowledge Encrypted Password, API Key & Document Manager**

Secure Personal Vault is a privacy-first web application built for managing passwords, credentials, API keys, dynamic custom categories, and sensitive documents. All data is encrypted strictly in your browser using Web Crypto API before reaching any database or server.

---

## ✨ Features

- **🔐 Zero-Knowledge Encryption**: Master password derives key via `PBKDF2` (600,000 iterations). All data encrypted with `AES-256-GCM` client-side.
- **🔑 Credential Management**: Store passwords, usernames, tags, websites, and custom fields safely.
- **📄 Encrypted Document Vault**: Upload PDFs, certificates, and files encrypted with SHA-256 integrity verification.
- **🏷️ Dynamic Categories & Templates**: Custom category hierarchies with custom field types (`Secret`, `Text`, `Date`, `URL`).
- **⚡ IndexedDB Cold-Start Cache**: Fast local caching in browser IndexedDB with `BroadcastChannel` multi-tab sync.
- **🗑️ Trash & Recovery**: Soft-delete items retained for 30 days before permanent purging.
- **🌐 Self-Hostable**: Deploy anywhere with Next.js, Supabase, and PostgreSQL.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Database & Auth**: [Supabase PostgreSQL](https://supabase.com/) & [Drizzle ORM](https://orm.drizzle.team/)
- **Encryption**: Web Crypto API (`AES-256-GCM`, `PBKDF2`)
- **Styling**: Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: Lucide Icons

## 🏠 Self-hosting and providers

The application includes a production standalone Docker image, Docker Compose
deployment, health endpoint, database migrations, and Linux install/update scripts.

- **Authentication:** Supabase Auth
- **Application data:** Supabase Postgres or another PostgreSQL-compatible database
- **File storage:** any S3-compatible service, including Cloudflare R2, AWS S3, MinIO,
  Backblaze B2, and Wasabi

MongoDB is not currently supported because the data and authorization model relies on
PostgreSQL transactions, foreign keys, Drizzle's PostgreSQL dialect, and optional RLS.

See [the self-hosting guide](./docs/self-hosting.md) for provider choices, Docker and
Dokploy deployment, security requirements, and the one-command installer.

### VPS quick start

Requirements: a Linux VPS with Git, Docker Engine, and Docker Compose v2. After pushing
this repository to GitHub, run:

```bash
curl -fsSL https://raw.githubusercontent.com/TanvirSEF/credential_system/main/scripts/install.sh | sudo sh
```

The first run clones the application and creates
`/opt/secure-personal-vault/.env`. During the same run it interactively asks for the
Supabase, PostgreSQL, and S3-compatible storage configuration. Secret inputs are hidden.
Answer `yes` when asked whether the database schema already exists if it was previously
created with `pnpm db:push`; database migrations and RLS writes will then be skipped.
For a new empty database, answer `no` to apply the committed migrations. After the
questions, the same command builds and starts the application—no second installer run
or manual `.env` editing is required.

Verify it at `http://YOUR_VPS_IP:3000/api/health`, then attach a domain and HTTPS using
Dokploy, Caddy, Nginx, or another reverse proxy. Do not expose PostgreSQL directly to
the internet.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm / npm / yarn
- Supabase Project (PostgreSQL database)

### Installation

1. **Clone repository**:
   ```bash
   git clone https://github.com/TanvirSEF/credential_system.git
   cd credential_system
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/postgres"
   DIRECT_URL="postgresql://user:password@host:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
   ```

4. **Run Database Migrations**:
   ```bash
   pnpm db:push
   ```

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License

Distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [`LICENSE`](./LICENSE) for details.
