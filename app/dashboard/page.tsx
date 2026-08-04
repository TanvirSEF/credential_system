"use client"

import { useEffect, useState } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { getUserProfileAction } from "@/lib/actions/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InstanceUpdateNotice } from "@/components/instance-update-notice"
import { useRouter } from "next/navigation"
import {
  Key,
  FileText,
  Folder,
  Trash2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Fingerprint,
  Server,
  Activity,
} from "lucide-react"

function DashboardContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<{
    email: string
    fullName: string
  } | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const userProf = await getUserProfileAction()
        if (userProf) setProfile(userProf)
      } catch {
        // The unlocked vault remains usable from encrypted local caches offline.
      }
    }
    void loadProfile()
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  })()

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-5 sm:space-y-8 sm:p-6 lg:p-8">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-[1.65rem] leading-tight font-extrabold tracking-tight sm:text-3xl">
            {greeting}
            {profile?.fullName ? `, ${profile.fullName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your vault is unlocked and ready. All data is encrypted client-side.
          </p>
        </div>
        <Badge className="w-fit gap-1.5 border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Vault Unlocked
        </Badge>
      </div>

      <InstanceUpdateNotice />

      {/* ── Stat cards row ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Credentials"
          description="Passwords & API keys"
          icon={<Key className="h-4 w-4" />}
          gradient="from-blue-500/15 to-blue-600/5"
          iconColor="text-blue-400"
          borderColor="border-blue-500/15"
          onClick={() => router.push("/dashboard/credentials")}
        />
        <StatCard
          label="Documents"
          description="Encrypted files"
          icon={<FileText className="h-4 w-4" />}
          gradient="from-violet-500/15 to-violet-600/5"
          iconColor="text-violet-400"
          borderColor="border-violet-500/15"
          onClick={() => router.push("/dashboard/documents")}
        />
        <StatCard
          label="Categories"
          description="Custom templates"
          icon={<Folder className="h-4 w-4" />}
          gradient="from-amber-500/15 to-amber-600/5"
          iconColor="text-amber-400"
          borderColor="border-amber-500/15"
          onClick={() => router.push("/dashboard/types")}
        />
        <StatCard
          label="Trash Bin"
          description="Recoverable items"
          icon={<Trash2 className="h-4 w-4" />}
          gradient="from-rose-500/15 to-rose-600/5"
          iconColor="text-rose-400"
          borderColor="border-rose-500/15"
          onClick={() => router.push("/dashboard/trash")}
        />
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Quick actions — 2 cols */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">
              Jump to common vault operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickAction
              icon={<Key className="h-4 w-4" />}
              title="Add Credential"
              description="Store a new password or API key"
              onClick={() => router.push("/dashboard/credentials")}
            />
            <QuickAction
              icon={<FileText className="h-4 w-4" />}
              title="Upload Document"
              description="Encrypt and store a file"
              onClick={() => router.push("/dashboard/documents")}
            />
            <QuickAction
              icon={<Folder className="h-4 w-4" />}
              title="Create Category"
              description="Organize with custom fields"
              onClick={() => router.push("/dashboard/types")}
            />
            <QuickAction
              icon={<Trash2 className="h-4 w-4" />}
              title="View Trash"
              description="Recover deleted items"
              onClick={() => router.push("/dashboard/trash")}
            />
          </CardContent>
        </Card>

        {/* Security status — 1 col */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="h-4 w-4 text-emerald-400" />
              Security Status
            </CardTitle>
            <CardDescription className="text-xs">
              Your vault&apos;s protection layers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SecurityRow
              icon={<ShieldCheck />}
              label="Encryption"
              value="AES-256-GCM"
              status="active"
            />
            <SecurityRow
              icon={<Fingerprint />}
              label="Key Derivation"
              value="PBKDF2 600K"
              status="active"
            />
            <SecurityRow
              icon={<Lock />}
              label="Auto-Lock"
              value="15 min idle"
              status="active"
            />
            <SecurityRow
              icon={<Server />}
              label="Server Access"
              value="Zero-Knowledge"
              status="active"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Encryption info bar ── */}
      <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
        <CardContent className="py-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/10">
              <Lock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-semibold">End-to-End Encrypted</p>
              <p className="text-xs text-muted-foreground">
                Your vault key is derived from your master password using PBKDF2
                with 600,000 iterations and never leaves this device. All data
                is encrypted with AES-256-GCM before reaching any server.
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-blue-500/20 font-mono text-[10px] text-blue-400"
            >
              256-BIT
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({
  label,
  description,
  icon,
  gradient,
  iconColor,
  borderColor,
  onClick,
}: {
  label: string
  description: string
  icon: React.ReactNode
  gradient: string
  iconColor: string
  borderColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative min-w-0 rounded-xl border ${borderColor} bg-gradient-to-br ${gradient} p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] sm:p-5`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border/30 bg-background/50 ${iconColor}`}
        >
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground/60" />
      </div>
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
    </button>
  )
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3.5 rounded-lg border border-border/40 p-3.5 text-left transition-all duration-200 hover:border-blue-500/25 hover:bg-blue-500/5"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-muted/50 text-muted-foreground transition-colors group-hover:border-blue-500/20 group-hover:bg-blue-500/10 group-hover:text-blue-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold transition-colors group-hover:text-foreground">
          {title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  )
}

function SecurityRow({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  status: "active" | "warning"
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/20 py-2.5 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {value}
      </span>
      <div
        className={`h-2 w-2 rounded-full ${status === "active" ? "bg-emerald-400" : "bg-amber-400"}`}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <VaultGuard>
      <DashboardContent />
    </VaultGuard>
  )
}
