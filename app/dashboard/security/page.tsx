"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  History,
  LoaderCircle,
  Repeat2,
  ShieldCheck,
} from "lucide-react"
import { VaultGuard } from "@/components/vault-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { loadDecryptedVaultIndex } from "@/lib/vault/decrypted-index"
import {
  analyzePasswordHealth,
  checkPwnedPassword,
  type PasswordHealthEntry,
} from "@/lib/security/vault-health"

const ISSUE_LABELS = {
  weak: "Weak",
  reused: "Reused",
  old: "Older than 180 days",
  exposed: "Found in breach data",
} as const

function SecurityHealthContent() {
  const { vaultId, vaultKey } = useVaultSessionStore()
  const [entries, setEntries] = useState<PasswordHealthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [breachChecking, setBreachChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vaultId || !vaultKey) return
    let cancelled = false
    window.setTimeout(() => {
      loadDecryptedVaultIndex(vaultId, vaultKey)
        .then((index) => {
          if (!cancelled) setEntries(analyzePasswordHealth(index.credentials))
        })
        .catch((caught) => {
          if (!cancelled) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Could not analyze vault."
            )
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
    }
  }, [vaultId, vaultKey])

  const counts = useMemo(
    () => ({
      total: entries.length,
      weak: entries.filter((entry) => entry.issues.includes("weak")).length,
      reused: entries.filter((entry) => entry.issues.includes("reused")).length,
      old: entries.filter((entry) => entry.issues.includes("old")).length,
      exposed: entries.filter((entry) => entry.issues.includes("exposed"))
        .length,
    }),
    [entries]
  )
  const riskyEntries = entries.filter((entry) => entry.issues.length > 0)

  async function runBreachCheck() {
    setBreachChecking(true)
    setError(null)
    try {
      const uniqueValues = [...new Set(entries.map((entry) => entry.value))]
      const results = new Map<string, number>()
      for (const value of uniqueValues) {
        results.set(value, await checkPwnedPassword(value))
      }
      setEntries((current) =>
        current.map((entry) => {
          const breachCount = results.get(entry.value) || 0
          return {
            ...entry,
            breachCount,
            issues: breachCount
              ? [...new Set([...entry.issues, "exposed" as const])]
              : entry.issues.filter((issue) => issue !== "exposed"),
          }
        })
      )
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Breach check failed."
      )
    } finally {
      setBreachChecking(false)
    }
  }

  return (
    <div className="max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Security Health
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Local analysis of password strength, reuse, age, and optional breach
            exposure.
          </p>
        </div>
        <Button
          onClick={runBreachCheck}
          disabled={loading || breachChecking || !entries.length}
        >
          {breachChecking ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <ShieldCheck />
          )}
          {breachChecking ? "Checking safely..." : "Check breach exposure"}
        </Button>
      </div>

      <p className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
        Breach checking is opt-in. Only the first five characters of a locally
        generated SHA-1 hash are sent using the HIBP k-anonymity range API;
        passwords never leave this device.
      </p>
      {error && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Analyzed",
            count: counts.total,
            icon: ShieldCheck,
            color: "text-blue-400",
          },
          {
            label: "Weak",
            count: counts.weak,
            icon: AlertTriangle,
            color: "text-amber-400",
          },
          {
            label: "Reused",
            count: counts.reused,
            icon: Repeat2,
            color: "text-orange-400",
          },
          {
            label: "Old",
            count: counts.old,
            icon: History,
            color: "text-violet-400",
          },
          {
            label: "Exposed",
            count: counts.exposed,
            icon: ShieldCheck,
            color: "text-red-400",
          },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">{metric.label}</CardTitle>
              <metric.icon className={`size-4 ${metric.color}`} />
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {metric.count}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items requiring attention</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Decrypting and
              analyzing locally...
            </div>
          ) : riskyEntries.length === 0 ? (
            <div className="flex items-center gap-3 py-8 text-sm text-emerald-500">
              <CheckCircle2 className="size-5" /> No password issues found.
            </div>
          ) : (
            <div className="divide-y">
              {riskyEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {entry.credentialTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.fieldLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.issues.map((issue) => (
                      <Badge
                        key={issue}
                        variant={
                          issue === "exposed" ? "destructive" : "secondary"
                        }
                      >
                        {ISSUE_LABELS[issue]}
                        {issue === "exposed" && entry.breachCount
                          ? ` (${entry.breachCount.toLocaleString()})`
                          : ""}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/dashboard/credentials" />}
                  >
                    Review <ExternalLink />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SecurityHealthPage() {
  return (
    <VaultGuard>
      <SecurityHealthContent />
    </VaultGuard>
  )
}
