"use client"

import { useState } from "react"
import { registerAction } from "@/lib/actions/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLogo } from "@/components/brand-logo"
import {
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const res = await registerAction(formData)

    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setSuccess(true)
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background font-sans">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-15%] left-[15%] h-[500px] w-[500px] animate-pulse rounded-full bg-indigo-600/8 blur-[120px]" />
        <div
          className="absolute right-[10%] bottom-[-10%] h-[400px] w-[400px] animate-pulse rounded-full bg-blue-500/6 blur-[100px]"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Left decorative panel — hidden on mobile */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 p-12 lg:flex lg:w-[45%] xl:w-[50%]">
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-[15%] right-[10%] h-[300px] w-[300px] rounded-full bg-white/10 blur-[80px]" />
        <div className="absolute bottom-[15%] left-[15%] h-[200px] w-[200px] rounded-full bg-sky-300/15 blur-[60px]" />

        <div className="relative z-10 max-w-md space-y-8 text-white">
          {/* Logo */}
          <BrandLogo preload />

          <div className="space-y-5">
            <h2 className="text-3xl leading-tight font-extrabold tracking-tight xl:text-4xl">
              Privacy is not
              <br />a feature. It&apos;s the
              <br />
              architecture.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Your vault is created with zero-knowledge principles. We
              can&apos;t read your data even if we wanted to.
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
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[400px] space-y-8">
            {success ? (
              /* ── Success state ── */
              <div className="space-y-6 py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-extrabold tracking-tight">
                    Account Created
                  </h2>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Check your email to verify your account, then sign in to set
                    up your vault.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-indigo-500"
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
                  <BrandLogo preload className="mb-6 w-[210px] lg:hidden" />

                  <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Create your vault
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Set up your zero-knowledge encrypted account
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                      <span className="text-[10px] font-bold">!</span>
                    </div>
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="John Doe"
                      className="h-11 border-border/60 bg-muted/30 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="h-11 border-border/60 bg-muted/30 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold">
                      Account Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                        className="h-11 border-border/60 bg-muted/30 pr-10 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full border-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all hover:from-indigo-500 hover:to-blue-500"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-muted-foreground/60">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    Encrypted end-to-end · Zero-knowledge architecture
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-white/80">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
        <CheckCircle2 className="h-3 w-3 text-emerald-300" />
      </div>
      {text}
    </div>
  )
}
