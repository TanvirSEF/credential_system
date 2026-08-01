import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
} from "lucide-react";

export const metadata = {
  title: "Secure Personal Vault — Zero-Knowledge Encrypted Password & Document Manager",
  description:
    "Privacy-first zero-knowledge web application for managing passwords, API keys, documents, and personal credentials encrypted on your device before upload.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Animated ambient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[5%] w-[600px] h-[600px] rounded-full bg-indigo-500/6 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[100px] animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/10">
            <span className="text-[15px] font-black text-white tracking-tighter leading-none" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.05em" }}>SP</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight font-heading bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-none">
              Secure Personal Vault
            </span>
            <span className="text-[10px] font-semibold text-blue-400/80 tracking-widest uppercase mt-0.5">
              Zero-Knowledge Encryption
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm", className: "text-xs font-semibold" })}>
            Sign In
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm", className: "text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/25 border-0" })}>
            Get Started
          </Link>
        </nav>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative px-6 pt-20 pb-24 md:pt-28 md:pb-32 max-w-5xl mx-auto text-center">
        <div className="space-y-8">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/5 text-[11px] font-semibold text-blue-400 tracking-wide">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AES-256-GCM · PBKDF2 600K Iterations · Client-Side Only
          </div>

          {/* Headline */}
          <h1 className="text-[2.75rem] sm:text-6xl md:text-[4.25rem] font-extrabold tracking-tight leading-[1.08] max-w-4xl mx-auto font-heading">
            Your passwords never{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                leave your device
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-60" />
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Open-source, zero-knowledge vault for passwords, API keys, and private documents.
            Everything is encrypted in your browser before it touches any server.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/register" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto px-8 font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/25 border-0" })}>
              Create Free Vault <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto px-8 text-sm border-border/60" })}>
              Unlock Existing Vault
            </Link>
          </div>
        </div>

        {/* ── Terminal-style crypto visualization ── */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-slate-950 shadow-2xl shadow-black/40 overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-[11px] font-mono text-slate-500">spv://crypto-engine</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400/80">ENCRYPTED</span>
              </div>
            </div>

            {/* Terminal body */}
            <div className="p-6 sm:p-8 font-mono text-[13px] space-y-4 text-left">
              {/* Input line */}
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-bold select-none shrink-0">$</span>
                <div>
                  <span className="text-slate-400">vault.encrypt(</span>
                  <span className="text-emerald-300">&quot;GitHub Production API Key&quot;</span>
                  <span className="text-slate-400">)</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* Output block */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Lock className="h-3 w-3" />
                  <span>AES-256-GCM Output</span>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 space-y-2.5">
                  <div>
                    <span className="text-slate-500">ciphertext: </span>
                    <span className="text-blue-300 break-all">9f8a31e8c4b7...d2a091e4f6c8</span>
                  </div>
                  <div>
                    <span className="text-slate-500">iv: </span>
                    <span className="text-sky-300">b7e2a419c8f0e3d1</span>
                  </div>
                  <div>
                    <span className="text-slate-500">kdf: </span>
                    <span className="text-indigo-300">PBKDF2-SHA256 × 600,000</span>
                  </div>
                </div>
              </div>

              {/* Status line */}
              <div className="flex items-center gap-2 text-emerald-400/80 text-[11px] pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Zero-knowledge boundary verified — plaintext never transmitted</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST STRIP ═══════════ */}
      <section className="border-y border-border/40 bg-muted/20 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs text-muted-foreground font-semibold">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Client-Side Encryption</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Open Source Architecture</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No Vendor Lock-In</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Self-Hostable</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> PostgreSQL + Supabase</div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
            Three layers of zero-knowledge protection
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative text-center space-y-4 p-6">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Fingerprint className="h-7 w-7 text-blue-400" />
            </div>
            <div className="absolute top-8 right-0 hidden md:block w-1/2 border-t border-dashed border-border/40" />
            <h3 className="text-lg font-bold font-heading">Master Password</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Derives a 256-bit key via PBKDF2 with 600,000 iterations. Never stored, never transmitted.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative text-center space-y-4 p-6">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
              <Lock className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="absolute top-8 right-0 hidden md:block w-1/2 border-t border-dashed border-border/40" />
            <h3 className="text-lg font-bold font-heading">Encrypt Locally</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All credentials, categories, and documents are encrypted with AES-256-GCM in your browser.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4 p-6">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
              <Server className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold font-heading">Store Ciphertext</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Only encrypted blobs reach the database. Even in a breach, attackers see random bytes.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES BENTO ═══════════ */}
      <section className="px-6 py-24 bg-muted/15 border-y border-border/40">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              A focused feature set designed around one principle: your data stays yours.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Security</p>
          <h2 className="text-3xl font-extrabold tracking-tight font-heading">Defense in depth</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SecurityItem icon={<ShieldCheck />} title="Row Level Security" desc="PostgreSQL RLS enforces per-user tenant isolation on every table." />
          <SecurityItem icon={<Globe />} title="CSP + HSTS Headers" desc="Strict Content Security Policy, X-Frame-Options DENY, and HSTS enabled." />
          <SecurityItem icon={<KeyRound />} title="Recovery Envelopes" desc="256-bit recovery key provides emergency access if master password is lost." />
          <SecurityItem icon={<EyeOff />} title="Auto-Lock & Zeroization" desc="Vault auto-locks after inactivity. Crypto buffers are zeroized on lock." />
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
            Ready to own your security?
          </h2>
          <p className="text-muted-foreground text-sm">
            Create your encrypted vault in under 60 seconds. No credit card required.
          </p>
          <Link href="/register" className={buttonVariants({ size: "lg", className: "px-10 font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/25 border-0" })}>
            Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center text-xs text-muted-foreground space-y-3 bg-muted/5">
        <div className="flex items-center justify-center gap-6 font-semibold">
          <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          <Link href="/register" className="hover:text-foreground transition-colors">Create Account</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        </div>
        <p className="text-muted-foreground/60">© 2026 Secure Personal Vault — Zero-Knowledge Privacy Architecture.</p>
      </footer>
    </div>
  );
}

/* ── Reusable sub-components ── */

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative p-6 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm hover:border-blue-500/30 hover:bg-card/70 transition-all duration-300">
      <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/15 group-hover:bg-blue-500/15 group-hover:border-blue-500/25 transition-colors">
        {icon}
      </div>
      <h3 className="text-base font-bold font-heading mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function SecurityItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl border border-border/40 bg-card/30 hover:border-blue-500/20 transition-colors">
      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold font-heading">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
