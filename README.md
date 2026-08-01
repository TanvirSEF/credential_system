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
