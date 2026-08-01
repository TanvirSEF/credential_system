import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LandingEncryptionSandbox } from "@/components/landing-encryption-sandbox";
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
} from "lucide-react";

export const metadata = {
  title: "Secure Personal Vault — Zero-Knowledge Encrypted Password & Document Manager",
  description:
    "Privacy-first zero-knowledge web application for managing passwords, API keys, documents, and personal credentials encrypted on your device before upload.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Ambient Electric Slate-Blue Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/20 via-sky-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold shadow-sm border border-blue-500/20">
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight font-heading">Secure Personal Vault</span>
            <Badge variant="outline" className="ml-2.5 text-[10px] uppercase border-blue-500/30 text-blue-400 font-mono">
              Zero-Knowledge
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign In
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm", className: "shadow-md bg-blue-600 hover:bg-blue-500" })}>
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-16 md:py-24 max-w-6xl mx-auto text-center space-y-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-400 shadow-sm">
          <KeyRound className="h-3.5 w-3.5 text-blue-400" />
          <span>Client-Side AES-256-GCM & PBKDF2 (600,000 Iterations)</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto font-heading">
          Your Secrets Encrypted <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
            Before Leaving Your Device
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The privacy-first personal vault for passwords, API keys, private documents, and custom category templates. We never see your master password or unencrypted data.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/register" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto px-8 font-bold shadow-xl text-base bg-blue-600 hover:bg-blue-500" })}>
            Launch Your Vault <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto px-8 text-base border-blue-500/30" })}>
            Unlock Existing Vault
          </Link>
        </div>

        {/* Hero Visual 3D Asset */}
        <div className="pt-6 relative max-w-4xl mx-auto">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/30 to-sky-400/20 rounded-3xl blur-2xl opacity-50" />
          <div className="relative rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl bg-slate-950/60 backdrop-blur-xl">
            <Image
              src="/images/hero_vault.png"
              alt="Secure Personal Vault 3D Interface"
              width={1200}
              height={675}
              priority
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>
        </div>

        {/* Live Interactive Encryption Sandbox */}
        <div className="pt-10">
          <LandingEncryptionSandbox />
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="px-6 py-20 bg-muted/20 border-t border-b relative">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
              Engineered for Absolute Privacy
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Every feature is built around the strict zero-knowledge cryptographic boundary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm hover:shadow-md transition-all border-blue-500/20 bg-card/60 backdrop-blur-md">
              <CardHeader className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  <Lock className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold font-heading">Zero-Knowledge Envelopes</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Your Master Password derives your 256-bit vault key via 600,000 PBKDF2 iterations directly in your browser. Server never sees your raw key.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-all border-blue-500/20 bg-card/60 backdrop-blur-md">
              <CardHeader className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  <Folder className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold font-heading">Dynamic Categories & Templates</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Build custom hierarchical category trees with custom form field templates (Secret Password, Text, Date, URL) for hosting, banking, & API keys.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-all border-blue-500/20 bg-card/60 backdrop-blur-md">
              <CardHeader className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold font-heading">Encrypted Document Vault</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Upload PDFs, images, and certificates encrypted locally with SHA-256 integrity checksums before private Supabase storage upload.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-all border-blue-500/20 bg-card/60 backdrop-blur-md">
              <CardHeader className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  <Zap className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold font-heading">Instant In-Memory Search</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Search titles, usernames, and tags instantaneously in browser memory without sending search query strings to any server.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-all border-blue-500/20 bg-card/60 backdrop-blur-md">
              <CardHeader className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  <Database className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold font-heading">IndexedDB Local Cache</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Local ciphertext caching in IndexedDB enables zero-delay cold-start loads while keeping unencrypted plaintext out of persistent storage.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-all border-blue-500/20 bg-card/60 backdrop-blur-md">
              <CardHeader className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold font-heading">Multi-Tab Session Sync</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Web BroadcastChannel API synchronizes vault locks across all open browser tabs and auto-locks after 15 minutes of inactivity.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Storage Architecture Visual Showcase */}
      <section className="px-6 py-20 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-left">
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-mono uppercase text-[10px]">
            Encrypted Storage Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading leading-tight">
            Encrypted Data Blocks Protected at Every Stage
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your data is converted into raw ciphertext blobs before touching any database or storage bucket. Even in the event of a database leak, attackers see only random cryptographic bytes.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>PostgreSQL Row Level Security (RLS) Tenant Isolation</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Strict HSTS & Content Security Policy (CSP) Headers</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Emergency 256-bit Recovery Envelope Backups</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl bg-slate-950/60 backdrop-blur-xl">
          <Image
            src="/images/storage_vault.png"
            alt="Encrypted Storage Architecture Illustration"
            width={800}
            height={600}
            className="w-full h-auto object-cover rounded-2xl"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 px-6 text-center text-xs text-muted-foreground space-y-3 bg-muted/10">
        <div className="flex items-center justify-center gap-6 font-semibold">
          <Link href="/login" className="hover:text-foreground">
            Sign In
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Create Account
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </div>
        <p>© 2026 Secure Personal Vault — Zero-Knowledge Privacy Architecture.</p>
      </footer>
    </div>
  );
}
