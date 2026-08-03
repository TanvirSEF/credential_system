"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getUserVaultStatus,
  recoverVaultAccessAction,
} from "@/lib/actions/vault"
import {
  createMasterEnvelopeForVaultKey,
  createRecoveryEnvelope,
  generateRecoveryKey,
  unlockVaultWithRecoveryKey,
} from "@/lib/crypto"
import type { KeyEnvelope } from "@/lib/crypto/types"
import {
  createRecoveryChallenge,
  downloadRecoveryKit,
  type RecoveryChallenge,
  verifyRecoveryChallenge,
} from "@/lib/recovery/recovery-kit"
import { broadcastMessage } from "@/lib/storage/broadcast-channel"
import { useVaultSessionStore } from "@/stores/vault-session-store"

type RecoveryStep = "key" | "password" | "kit" | "success"

export default function RecoverVaultPage() {
  const router = useRouter()
  const setUnlockedSession = useVaultSessionStore((s) => s.setUnlockedSession)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [step, setStep] = useState<RecoveryStep>("key")
  const [vaultId, setVaultId] = useState("")
  const [masterUpdatedAt, setMasterUpdatedAt] = useState("")
  const [recoveryUpdatedAt, setRecoveryUpdatedAt] = useState("")
  const [recoveryEnvelope, setRecoveryEnvelope] = useState<KeyEnvelope | null>(
    null
  )
  const [recoveredVaultKey, setRecoveredVaultKey] = useState<CryptoKey | null>(
    null
  )
  const [oldRecoveryKey, setOldRecoveryKey] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pendingMasterEnvelope, setPendingMasterEnvelope] =
    useState<KeyEnvelope | null>(null)
  const [pendingRecoveryEnvelope, setPendingRecoveryEnvelope] =
    useState<KeyEnvelope | null>(null)
  const [newRecoveryKey, setNewRecoveryKey] = useState("")
  const [challenge, setChallenge] = useState<RecoveryChallenge | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [storedSafely, setStoredSafely] = useState(false)
  const [copied, setCopied] = useState(false)
  const [otherSessionsInvalidated, setOtherSessionsInvalidated] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getUserVaultStatus().then((status) => {
      if (cancelled) return
      if (status.error) {
        setError(status.error)
        setLoading(false)
      } else if (!status.authenticated) {
        router.replace("/login")
      } else if (!status.hasVault) {
        router.replace("/setup")
      } else if (
        !status.recoveryEnvelope ||
        !status.masterEnvelopeUpdatedAt ||
        !status.recoveryEnvelopeUpdatedAt ||
        !status.vaultId
      ) {
        setError("This vault does not have a usable recovery envelope.")
        setLoading(false)
      } else {
        setVaultId(status.vaultId)
        setRecoveryEnvelope(status.recoveryEnvelope)
        setMasterUpdatedAt(status.masterEnvelopeUpdatedAt)
        setRecoveryUpdatedAt(status.recoveryEnvelopeUpdatedAt)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [router])

  async function verifyOldRecoveryKey(event: React.FormEvent) {
    event.preventDefault()
    if (!recoveryEnvelope || !oldRecoveryKey.trim()) return
    setWorking(true)
    setError(null)
    try {
      const vaultKey = await unlockVaultWithRecoveryKey(
        oldRecoveryKey,
        recoveryEnvelope
      )
      setRecoveredVaultKey(vaultKey)
      setOldRecoveryKey("")
      setShowSecret(false)
      setStep("password")
    } catch {
      setError("That recovery key is invalid. Check every group and try again.")
    } finally {
      setWorking(false)
    }
  }

  async function prepareReplacementEnvelopes(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!recoveredVaultKey) return
    if (newPassword.length < 12) {
      setError("The new master password must be at least 12 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("The new master passwords do not match.")
      return
    }

    setWorking(true)
    try {
      const replacementMasterEnvelope = await createMasterEnvelopeForVaultKey(
        newPassword,
        recoveredVaultKey,
        vaultId
      )
      const replacementRecoveryKey = generateRecoveryKey()
      const replacementRecoveryEnvelope = await createRecoveryEnvelope(
        replacementRecoveryKey,
        recoveredVaultKey
      )

      setPendingMasterEnvelope(replacementMasterEnvelope)
      setPendingRecoveryEnvelope(replacementRecoveryEnvelope)
      setNewRecoveryKey(replacementRecoveryKey)
      setChallenge(createRecoveryChallenge(replacementRecoveryKey))
      setNewPassword("")
      setConfirmPassword("")
      setStep("kit")
    } catch {
      setError("Could not prepare the new vault security keys.")
    } finally {
      setWorking(false)
    }
  }

  async function copyNewRecoveryKey() {
    try {
      await navigator.clipboard.writeText(newRecoveryKey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 3000)
    } catch {
      setError(
        "Clipboard access was blocked. Download the recovery kit instead."
      )
    }
  }

  async function finishRecovery() {
    if (
      !recoveredVaultKey ||
      !pendingMasterEnvelope ||
      !pendingRecoveryEnvelope ||
      !challenge
    )
      return
    setError(null)
    if (!verifyRecoveryChallenge(challenge, answers)) {
      setError("One or more recovery-key groups do not match.")
      return
    }
    if (!storedSafely) {
      setError("Confirm that you stored the new recovery kit safely.")
      return
    }

    setWorking(true)
    try {
      const result = await recoverVaultAccessAction({
        vaultId,
        expectedMasterUpdatedAt: masterUpdatedAt,
        expectedRecoveryUpdatedAt: recoveryUpdatedAt,
        masterEnvelope: pendingMasterEnvelope,
        recoveryEnvelope: pendingRecoveryEnvelope,
      })
      if (result.error) throw new Error(result.error)

      broadcastMessage({ type: "VAULT_LOCKED" })
      setUnlockedSession(recoveredVaultKey, vaultId)
      setOtherSessionsInvalidated(result.otherSessionsInvalidated !== false)
      setPendingMasterEnvelope(null)
      setPendingRecoveryEnvelope(null)
      setNewRecoveryKey("")
      setChallenge(null)
      setAnswers({})
      setStep("success")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Vault recovery failed."
      )
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-5 animate-spin text-primary" />
        Loading encrypted recovery state...
      </main>
    )
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <BackgroundDecoration />
      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo preload className="w-[235px]" />
        </div>

        <Card className="overflow-hidden border-border/70 bg-card/90 py-0 shadow-2xl shadow-primary/[0.08] backdrop-blur-xl">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-primary to-violet-500" />
          <CardHeader className="items-center space-y-3 px-6 pt-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              {step === "success" ? (
                <CheckCircle2 className="size-7" />
              ) : (
                <KeyRound className="size-7" />
              )}
            </span>
            <div>
              <CardTitle className="font-heading text-2xl font-extrabold">
                {step === "key"
                  ? "Recover vault access"
                  : step === "password"
                    ? "Set a new master password"
                    : step === "kit"
                      ? "Save your new recovery kit"
                      : "Vault access recovered"}
              </CardTitle>
              <CardDescription className="mt-2 leading-relaxed">
                {step === "key"
                  ? "The recovery key is processed only in this browser."
                  : step === "password"
                    ? "The same vault key will be protected by your new password."
                    : step === "kit"
                      ? "The existing master password and recovery key remain active until this step succeeds."
                      : "Your previous master password and recovery key have been revoked."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pt-2 pb-7">
            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {step === "key" && (
              <form onSubmit={verifyOldRecoveryKey} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="old-recovery-key">Current recovery key</Label>
                  <div className="relative">
                    <Input
                      id="old-recovery-key"
                      type={showSecret ? "text" : "password"}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="h-12 pr-11 font-mono uppercase"
                      placeholder="SPV-XXXX-XXXX-XXXX-..."
                      value={oldRecoveryKey}
                      onChange={(event) =>
                        setOldRecoveryKey(event.target.value.toUpperCase())
                      }
                      disabled={working || !recoveryEnvelope}
                    />
                    <button
                      type="button"
                      aria-label={
                        showSecret ? "Hide recovery key" : "Show recovery key"
                      }
                      className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                      onClick={() => setShowSecret((current) => !current)}
                    >
                      {showSecret ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={working || !oldRecoveryKey.trim()}
                >
                  {working ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <KeyRound />
                  )}
                  Verify recovery key
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/unlock")}
                >
                  Return to normal unlock
                </Button>
              </form>
            )}

            {step === "password" && (
              <form
                onSubmit={prepareReplacementEnvelopes}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="new-master-password">
                    New master password
                  </Label>
                  <Input
                    id="new-master-password"
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={working}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-master-password">
                    Confirm new master password
                  </Label>
                  <Input
                    id="confirm-new-master-password"
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={working}
                  />
                </div>
                <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  This must be different from your account sign-in password and
                  cannot be recovered by the server.
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={working || !newPassword || !confirmPassword}
                >
                  {working ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <LockKeyhole />
                  )}
                  Continue to recovery kit
                </Button>
              </form>
            )}

            {step === "kit" && challenge && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/40 p-4 text-center font-mono text-sm font-bold tracking-wider break-all text-primary">
                  {newRecoveryKey}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={copyNewRecoveryKey}>
                    <Clipboard /> {copied ? "Copied" : "Copy key"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => downloadRecoveryKit(newRecoveryKey, vaultId)}
                  >
                    <Download /> Download kit
                  </Button>
                </div>
                <div className="space-y-3 border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Enter these groups from the saved key:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {challenge.positions.map((position) => (
                      <div key={position} className="space-y-1.5">
                        <Label htmlFor={`kit-group-${position}`}>
                          Group {position + 1}
                        </Label>
                        <Input
                          id={`kit-group-${position}`}
                          className="font-mono uppercase"
                          maxLength={4}
                          autoComplete="off"
                          value={answers[position] || ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [position]: event.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4"
                      checked={storedSafely}
                      onChange={(event) =>
                        setStoredSafely(event.target.checked)
                      }
                    />
                    I stored this new kit safely and understand that the old
                    recovery key will stop working.
                  </label>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={working || !storedSafely}
                  onClick={finishRecovery}
                >
                  {working ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  Activate new password and key
                </Button>
              </div>
            )}

            {step === "success" && (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed">
                  The vault data was not re-encrypted. Only its master and
                  recovery envelopes were securely replaced.
                </div>
                {!otherSessionsInvalidated && (
                  <p className="text-xs text-amber-500">
                    Other account sessions could not be invalidated
                    automatically. Review active sessions in your auth provider.
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => router.replace("/dashboard")}
                >
                  Open dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function BackgroundDecoration() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_0)] bg-[size:28px_28px] opacity-30" />
      <div className="absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/[0.09] blur-[120px]" />
      <div className="absolute -right-40 -bottom-48 size-[28rem] rounded-full bg-violet-500/[0.07] blur-[110px]" />
    </div>
  )
}
