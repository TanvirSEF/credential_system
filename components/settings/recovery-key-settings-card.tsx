"use client"

import { useState } from "react"
import {
  CheckCircle2,
  Clipboard,
  Download,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getUserVaultStatus,
  rotateRecoveryEnvelopeAction,
} from "@/lib/actions/vault"
import {
  createRecoveryEnvelope,
  generateRecoveryKey,
  unlockVaultWithMasterPassword,
} from "@/lib/crypto"
import type { KeyEnvelope } from "@/lib/crypto/types"
import {
  createRecoveryChallenge,
  downloadRecoveryKit,
  type RecoveryChallenge,
  verifyRecoveryChallenge,
} from "@/lib/recovery/recovery-kit"
import { useVaultSessionStore } from "@/stores/vault-session-store"

type RotationStep = "authenticate" | "verify" | "success"

export function RecoveryKeySettingsCard() {
  const { vaultId } = useVaultSessionStore()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<RotationStep>("authenticate")
  const [masterPassword, setMasterPassword] = useState("")
  const [masterEnvelope, setMasterEnvelope] = useState<KeyEnvelope | null>(null)
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState("")
  const [recoveryKey, setRecoveryKey] = useState("")
  const [pendingEnvelope, setPendingEnvelope] = useState<KeyEnvelope | null>(
    null
  )
  const [challenge, setChallenge] = useState<RecoveryChallenge | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [storedSafely, setStoredSafely] = useState(false)
  const [copied, setCopied] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStep("authenticate")
    setMasterPassword("")
    setMasterEnvelope(null)
    setExpectedUpdatedAt("")
    setRecoveryKey("")
    setPendingEnvelope(null)
    setChallenge(null)
    setAnswers({})
    setStoredSafely(false)
    setCopied(false)
    setError(null)
  }

  function closeAndReset() {
    if (working) return
    setOpen(false)
    reset()
  }

  async function beginRotation() {
    reset()
    setOpen(true)
    setWorking(true)
    try {
      const status = await getUserVaultStatus()
      if (
        status.error ||
        !status.authenticated ||
        !status.hasVault ||
        !status.masterEnvelope ||
        !status.recoveryEnvelopeUpdatedAt ||
        status.vaultId !== vaultId
      ) {
        throw new Error(status.error || "Vault recovery settings unavailable.")
      }
      setMasterEnvelope(status.masterEnvelope)
      setExpectedUpdatedAt(status.recoveryEnvelopeUpdatedAt)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load recovery settings."
      )
    } finally {
      setWorking(false)
    }
  }

  async function authenticateAndGenerate() {
    if (!masterEnvelope || !masterPassword || !vaultId) return
    setWorking(true)
    setError(null)
    try {
      const confirmedVaultKey = await unlockVaultWithMasterPassword(
        masterPassword,
        masterEnvelope
      )
      const nextRecoveryKey = generateRecoveryKey()
      const nextEnvelope = await createRecoveryEnvelope(
        nextRecoveryKey,
        confirmedVaultKey
      )
      setRecoveryKey(nextRecoveryKey)
      setPendingEnvelope(nextEnvelope)
      setChallenge(createRecoveryChallenge(nextRecoveryKey))
      setMasterPassword("")
      setStep("verify")
    } catch {
      setError("That master password did not unlock this vault.")
    } finally {
      setWorking(false)
    }
  }

  async function copyRecoveryKey() {
    try {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 3000)
    } catch {
      setError(
        "Clipboard access was blocked. Download the recovery kit instead."
      )
    }
  }

  async function completeRotation() {
    if (!vaultId || !pendingEnvelope || !challenge || !expectedUpdatedAt) return
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
      const result = await rotateRecoveryEnvelopeAction({
        vaultId,
        expectedUpdatedAt,
        recoveryEnvelope: pendingEnvelope,
      })
      if (result.error) throw new Error(result.error)
      setExpectedUpdatedAt(result.updatedAt || "")
      setPendingEnvelope(null)
      setStep("success")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Recovery rotation failed."
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <KeyRound className="size-5" />
            </div>
            <div>
              <CardTitle>Emergency recovery key</CardTitle>
              <CardDescription>
                Replace a lost recovery key while your master password still
                works.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Rotation re-wraps only the in-memory vault key. Your encrypted
            credentials and documents are not decrypted or uploaded again.
          </p>
          <Button variant="outline" onClick={beginRotation}>
            <RefreshCw /> Replace recovery key
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (working) return
          setOpen(next)
          if (!next) reset()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === "authenticate"
                ? "Confirm your master password"
                : step === "verify"
                  ? "Save and verify the new recovery kit"
                  : "Recovery key replaced"}
            </DialogTitle>
            <DialogDescription>
              {step === "authenticate"
                ? "Your master password is verified locally and never sent to the server."
                : step === "verify"
                  ? "The old key remains active until you finish this verification."
                  : "The old recovery key has been revoked."}
            </DialogDescription>
          </DialogHeader>

          {step === "authenticate" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-master-password">
                  Vault master password
                </Label>
                <Input
                  id="recovery-master-password"
                  type="password"
                  autoComplete="current-password"
                  value={masterPassword}
                  onChange={(event) => setMasterPassword(event.target.value)}
                  disabled={working || !masterEnvelope}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") authenticateAndGenerate()
                  }}
                />
              </div>
              <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                Anyone holding the new key together with account access can
                recover this vault. Store it separately from your password.
              </div>
            </div>
          )}

          {step === "verify" && challenge && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4 text-center font-mono text-sm font-bold tracking-wider break-all text-primary">
                {recoveryKey}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" onClick={copyRecoveryKey}>
                  <Clipboard /> {copied ? "Copied" : "Copy key"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => downloadRecoveryKit(recoveryKey, vaultId!)}
                >
                  <Download /> Download kit
                </Button>
              </div>
              <div className="space-y-3 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Enter these groups from the saved key (do not include
                  hyphens):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {challenge.positions.map((position) => (
                    <div key={position} className="space-y-1.5">
                      <Label htmlFor={`recovery-group-${position}`}>
                        Group {position + 1}
                      </Label>
                      <Input
                        id={`recovery-group-${position}`}
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
                    onChange={(event) => setStoredSafely(event.target.checked)}
                  />
                  I stored the new recovery kit somewhere safe and separate.
                </label>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-5 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-6" />
              </span>
              <p className="font-semibold">Your new recovery key is active.</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                The previous recovery key can no longer unlock this vault. Keep
                the downloaded kit offline and private.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            {step === "success" ? (
              <Button onClick={closeAndReset}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={working}
                  onClick={closeAndReset}
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    working ||
                    (step === "authenticate"
                      ? !masterPassword || !masterEnvelope
                      : !storedSafely)
                  }
                  onClick={
                    step === "authenticate"
                      ? authenticateAndGenerate
                      : completeRotation
                  }
                >
                  {working ? (
                    <LoaderCircle className="animate-spin" />
                  ) : step === "authenticate" ? (
                    <KeyRound />
                  ) : (
                    <RefreshCw />
                  )}
                  {step === "authenticate"
                    ? "Generate new key"
                    : "Activate new key"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
