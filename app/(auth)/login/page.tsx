"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await loginAction(formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background flex font-sans relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/6 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 items-center justify-center p-12 overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        {/* Glow orbs */}
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] rounded-full bg-white/10 blur-[80px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[200px] h-[200px] rounded-full bg-sky-400/15 blur-[60px]" />

        <div className="relative z-10 max-w-md space-y-8 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <span className="text-lg font-black tracking-tighter" style={{ letterSpacing: "-0.05em" }}>SP</span>
            </div>
            <div>
              <p className="font-extrabold text-lg leading-none tracking-tight">Secure Personal Vault</p>
              <p className="text-[10px] font-semibold text-white/60 tracking-widest uppercase mt-0.5">Zero-Knowledge</p>
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
              Your data never<br />leaves your device.
            </h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm">
              All encryption happens in your browser. We never see your passwords, documents, or master key — by design.
            </p>
          </div>

          {/* Trust indicators */}
          <div className="space-y-3 pt-2">
            <TrustItem text="AES-256-GCM Client-Side Encryption" />
            <TrustItem text="PBKDF2 with 600,000 Iterations" />
            <TrustItem text="Open Source & Self-Hostable" />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="px-6 sm:px-10 pt-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-semibold gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Header */}
            <div className="space-y-2">
              {/* Mobile-only logo */}
              <div className="flex items-center gap-2.5 mb-6 lg:hidden">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/10">
                  <span className="text-[13px] font-black text-white tracking-tighter" style={{ letterSpacing: "-0.05em" }}>SP</span>
                </div>
                <span className="text-sm font-bold text-muted-foreground">Secure Personal Vault</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to unlock your encrypted vault</p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 text-sm text-destructive flex items-start gap-2.5">
                <div className="h-4 w-4 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold">!</span>
                </div>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-11 bg-muted/30 border-border/60 focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold">Account Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="h-11 pr-10 bg-muted/30 border-border/60 focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/25 border-0 transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" /> Sign In to Vault
                  </span>
                )}
              </Button>
            </form>

            {/* Bottom trust note */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60 pt-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Encrypted end-to-end · Zero-knowledge architecture</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-white/80">
      <div className="h-5 w-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        <ShieldCheck className="h-3 w-3 text-emerald-300" />
      </div>
      {text}
    </div>
  );
}
