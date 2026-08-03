import Link from "next/link"
import { CloudOff, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_0)] bg-[size:28px_28px] opacity-30" />
        <div className="absolute -top-48 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[120px]" />
      </div>

      <section className="relative w-full max-w-md text-center">
        <BrandLogo preload className="mx-auto mb-7 w-[235px]" />
        <div className="rounded-2xl border bg-card/90 p-6 shadow-2xl shadow-primary/[0.06] backdrop-blur-xl sm:p-8">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <CloudOff className="size-6" />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-extrabold">
            You&apos;re offline
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Secure Personal Vault needs a connection to verify your session and
            load encrypted data.
          </p>

          <div className="mt-5 rounded-xl border bg-muted/20 p-3.5 text-left">
            <div className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" />
              Authenticated pages and encrypted records are intentionally never
              stored in the offline page cache.
            </div>
          </div>

          <Button render={<Link href="/login" />} className="mt-6 w-full">
            <RefreshCw /> Try again
          </Button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            Your vault remains protected
          </p>
        </div>
      </section>
    </main>
  )
}
