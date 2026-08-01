"use client";

import { useState } from "react";
import { registerAction } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await registerAction(formData);

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccess(true);
    }
  }

  return (
    <div className="min-h-screen bg-background flex font-sans relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-15%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-500/6 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 items-center justify-center p-12 overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        {/* Glow orbs */}
        <div className="absolute top-[15%] right-[10%] w-[300px] h-[300px] rounded-full bg-white/10 blur-[80px]" />
        <div className="absolute bottom-[15%] left-[15%] w-[200px] h-[200px] rounded-full bg-sky-300/15 blur-[60px]" />

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
              Privacy is not<br />a feature. It&apos;s the<br />architecture.
            </h2>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm">
              Your vault is created with zero-knowledge principles. We can&apos;t read your data even if we wanted to.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 pt-2">
            <FeatureItem text="Passwords, API keys & documents in one vault" />
            <FeatureItem text="256-bit recovery key for emergency access" />
            <FeatureItem text="Free forever, no credit card required" />
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
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
          <div className="w-full max-w-[400px] space-y-8">
            {success ? (
              /* ── Success state ── */
              <div className="space-y-6 text-center py-8">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold tracking-tight font-heading">Account Created</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Check your email to verify your account, then sign in to set up your vault.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  Continue to Sign In
                </Link>
              </div>
            ) : (
              /* ── Registration form ── */
              <>
                {/* Header */}
                <div className="space-y-2">
                  {/* Mobile-only logo */}
                  <div className="flex items-center gap-2.5 mb-6 lg:hidden">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
                      <span className="text-[13px] font-black text-white tracking-tighter" style={{ letterSpacing: "-0.05em" }}>SP</span>
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">Secure Personal Vault</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">Create your vault</h1>
                  <p className="text-sm text-muted-foreground">Set up your zero-knowledge encrypted account</p>
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
                    <Label htmlFor="fullName" className="text-xs font-semibold">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="John Doe"
                      className="h-11 bg-muted/30 border-border/60 focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>

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
                        minLength={8}
                        placeholder="At least 8 characters"
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
                    className="w-full h-11 font-bold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/25 border-0 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Vault...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserPlus className="h-3.5 w-3.5" /> Create Account
                      </span>
                    )}
                  </Button>
                </form>

                {/* Bottom trust note */}
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60 pt-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Encrypted end-to-end · Zero-knowledge architecture</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-white/80">
      <div className="h-5 w-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-3 w-3 text-emerald-300" />
      </div>
      {text}
    </div>
  );
}
