import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import {
  Shield,
  Lock,
  FileText,
  Folder,
  Zap,
  ArrowRight,
  Database,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  Server,
  Globe,
} from "lucide-react"

export const metadata = {
  title:
    "Secure Personal Vault — Zero-Knowledge Encrypted Password & Document Manager",
  description:
    "Privacy-first zero-knowledge web application for managing passwords, API keys, documents, and personal credentials encrypted on your device before upload.",
}

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Animated ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] h-[500px] w-[500px] animate-pulse rounded-full bg-blue-600/8 blur-[120px]" />
        <div
          className="absolute right-[5%] bottom-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-indigo-500/6 blur-[150px]"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-[40%] left-[50%] h-[300px] w-[300px] animate-pulse rounded-full bg-sky-500/5 blur-[100px]"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/70 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <Link href="/" aria-label="Secure Personal Vault home">
          <BrandLogo
            preload
            className="h-12 w-[175px] min-[480px]:w-[270px] [&>img]:w-[250px] min-[480px]:[&>img]:w-[340px]"
          />
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "text-xs font-semibold",
            })}
          >
            Sign In
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Get Started
          </Link>
        </nav>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center md:pt-28 md:pb-32">
        <div className="space-y-8">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/5 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-blue-400">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            AES-256-GCM · PBKDF2 600K Iterations · Client-Side Only
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl font-heading text-[2.75rem] leading-[1.08] font-extrabold tracking-tight sm:text-6xl md:text-[4.25rem]">
            Your passwords never{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                leave your device
              </span>
              <span className="absolute right-0 -bottom-1 left-0 h-[3px] rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-60" />
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Open-source, zero-knowledge vault for passwords, API keys, and
            private documents. Everything is encrypted in your browser before it
            touches any server.
          </p>

          {/* CTA row */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Create Free Vault <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Unlock Existing Vault
            </Link>
          </div>
        </div>

        {/* ── Terminal-style crypto visualization ── */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-slate-950 shadow-2xl shadow-black/40">
            {/* Window chrome */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                spv://crypto-engine
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px] text-emerald-400/80">
                  ENCRYPTED
                </span>
              </div>
            </div>

            {/* Terminal body */}
            <div className="space-y-4 p-6 text-left font-mono text-[13px] sm:p-8">
              {/* Input line */}
              <div className="flex items-start gap-3">
                <span className="shrink-0 font-bold text-blue-400 select-none">
                  $
                </span>
                <div>
                  <span className="text-slate-400">vault.encrypt(</span>
                  <span className="text-emerald-300">
                    &quot;GitHub Production API Key&quot;
                  </span>
                  <span className="text-slate-400">)</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* Output block */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Lock className="h-3 w-3" />
                  <span>AES-256-GCM Output</span>
                </div>
                <div className="space-y-2.5 rounded-lg border border-white/5 bg-white/[0.03] p-4">
                  <div>
                    <span className="text-slate-500">ciphertext: </span>
                    <span className="break-all text-blue-300">
                      9f8a31e8c4b7...d2a091e4f6c8
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">iv: </span>
                    <span className="text-sky-300">b7e2a419c8f0e3d1</span>
                  </div>
                  <div>
                    <span className="text-slate-500">kdf: </span>
                    <span className="text-indigo-300">
                      PBKDF2-SHA256 × 600,000
                    </span>
                  </div>
                </div>
              </div>

              {/* Status line */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400/80">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  Zero-knowledge boundary verified — plaintext never transmitted
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST STRIP ═══════════ */}
      <section className="border-y border-border/40 bg-muted/20 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{" "}
            Client-Side Encryption
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Open
            Source Architecture
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No Vendor
            Lock-In
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{" "}
            Self-Hostable
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> PostgreSQL
            + Supabase
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-16 space-y-3 text-center">
          <p className="text-xs font-bold tracking-widest text-blue-400 uppercase">
            How It Works
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            Three layers of zero-knowledge protection
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <div className="relative space-y-4 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <Fingerprint className="h-7 w-7 text-blue-400" />
            </div>
            <div className="absolute top-8 right-0 hidden w-1/2 border-t border-dashed border-border/40 md:block" />
            <h3 className="font-heading text-lg font-bold">Master Password</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Derives a 256-bit key via PBKDF2 with 600,000 iterations. Never
              stored, never transmitted.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative space-y-4 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10">
              <Lock className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="absolute top-8 right-0 hidden w-1/2 border-t border-dashed border-border/40 md:block" />
            <h3 className="font-heading text-lg font-bold">Encrypt Locally</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All credentials, categories, and documents are encrypted with
              AES-256-GCM in your browser.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
              <Server className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="font-heading text-lg font-bold">Store Ciphertext</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Only encrypted blobs reach the database. Even in a breach,
              attackers see random bytes.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES BENTO ═══════════ */}
      <section className="border-y border-border/40 bg-muted/15 px-6 py-24">
        <div className="mx-auto max-w-6xl space-y-14">
          <div className="space-y-3 text-center">
            <p className="text-xs font-bold tracking-widest text-blue-400 uppercase">
              Capabilities
            </p>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground">
              A focused feature set designed around one principle: your data
              stays yours.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              title="Zero-Knowledge Envelopes"
              description="Master password derives vault key via PBKDF2 client-side. Server stores only wrapped ciphertext."
            />
            <FeatureCard
              icon={<Folder className="h-5 w-5" />}
              title="Dynamic Categories"
              description="Create hierarchical category trees with custom field templates — Secret, Text, Date, URL."
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="Encrypted Documents"
              description="PDFs, images, certificates encrypted with SHA-256 integrity verification before private upload."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Instant Local Search"
              description="Search titles, usernames, and tags in browser memory. Zero search queries hit the server."
            />
            <FeatureCard
              icon={<Database className="h-5 w-5" />}
              title="IndexedDB Cache"
              description="Ciphertext caching in IndexedDB for instant cold-start loads. Plaintext never persisted."
            />
            <FeatureCard
              icon={<RefreshCw className="h-5 w-5" />}
              title="Multi-Tab Sync"
              description="BroadcastChannel syncs vault locks across tabs. 15-minute inactivity auto-lock."
            />
          </div>
        </div>
      </section>

      {/* ═══════════ SECURITY GRID ═══════════ */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-14 space-y-3 text-center">
          <p className="text-xs font-bold tracking-widest text-blue-400 uppercase">
            Security
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight">
            Defense in depth
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SecurityItem
            icon={<ShieldCheck />}
            title="Row Level Security"
            desc="PostgreSQL RLS enforces per-user tenant isolation on every table."
          />
          <SecurityItem
            icon={<Globe />}
            title="CSP + HSTS Headers"
            desc="Strict Content Security Policy, X-Frame-Options DENY, and HSTS enabled."
          />
          <SecurityItem
            icon={<KeyRound />}
            title="Recovery Envelopes"
            desc="256-bit recovery key provides emergency access if master password is lost."
          />
          <SecurityItem
            icon={<EyeOff />}
            title="Auto-Lock & Zeroization"
            desc="Vault auto-locks after inactivity. Crypto buffers are zeroized on lock."
          />
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to own your security?
          </h2>
          <p className="text-sm text-muted-foreground">
            Create your encrypted vault in under 60 seconds. No credit card
            required.
          </p>
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="space-y-3 border-t bg-muted/5 px-6 py-8 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-6 font-semibold">
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="transition-colors hover:text-foreground"
          >
            Create Account
          </Link>
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
        <p className="text-muted-foreground/60">
          © 2026 Secure Personal Vault — Zero-Knowledge Privacy Architecture.
        </p>
      </footer>
    </div>
  )
}

/* ── Reusable sub-components ── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group relative rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:bg-card/70">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/15 bg-blue-500/10 text-blue-400 transition-colors group-hover:border-blue-500/25 group-hover:bg-blue-500/15">
        {icon}
      </div>
      <h3 className="mb-1.5 font-heading text-base font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function SecurityItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border/40 bg-card/30 p-5 transition-colors hover:border-blue-500/20">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div>
        <h4 className="font-heading text-sm font-bold">{title}</h4>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  )
}
