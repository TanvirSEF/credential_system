"use client"

import { useRef, useState } from "react"
import {
  ArchiveRestore,
  Download,
  FileLock2,
  LoaderCircle,
  Upload,
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
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { broadcastMessage } from "@/lib/storage/broadcast-channel"
import {
  decryptVaultBackup,
  exportVaultBackup,
  restoreVaultBackup,
  type BackupProgress,
  type RestoreSummary,
} from "@/lib/backup/vault-backup"

function progressText(progress: BackupProgress | null) {
  if (!progress) return ""
  return progress.total > 1
    ? `${progress.message} (${progress.current}/${progress.total})`
    : progress.message
}

export function BackupSettingsCard() {
  const { vaultId, vaultKey } = useVaultSessionStore()
  const [exportOpen, setExportOpen] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState<BackupProgress | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<RestoreSummary | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function reset() {
    setPassword("")
    setConfirmPassword("")
    setFile(null)
    setProgress(null)
    setMessage(null)
    setSummary(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  async function handleExport() {
    if (!vaultId || !vaultKey) return
    if (password.length < 12)
      return setMessage("Use at least 12 characters for the backup password.")
    if (password !== confirmPassword)
      return setMessage("Backup passwords do not match.")
    setWorking(true)
    setMessage(null)
    try {
      const blob = await exportVaultBackup(
        vaultId,
        vaultKey,
        password,
        setProgress
      )
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `sp-vault-${new Date().toISOString().slice(0, 10)}.spvault`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setMessage("Encrypted backup downloaded. Store its password separately.")
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Backup failed.")
    } finally {
      setWorking(false)
      setProgress(null)
    }
  }

  async function handleRestore() {
    if (!vaultId || !vaultKey || !file) return
    setWorking(true)
    setMessage(null)
    setSummary(null)
    try {
      setProgress({
        phase: "preparing",
        current: 0,
        total: 1,
        message: "Decrypting and validating archive",
      })
      const payload = await decryptVaultBackup(file, password)
      const result = await restoreVaultBackup(
        payload,
        vaultId,
        vaultKey,
        setProgress
      )
      setSummary(result)
      setMessage("Restore completed successfully.")
      broadcastMessage({ type: "CACHE_INVALIDATED" })
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Restore failed.")
    } finally {
      setWorking(false)
      setProgress(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <FileLock2 className="size-5" />
            </div>
            <div>
              <CardTitle>Encrypted backup & restore</CardTitle>
              <CardDescription>
                Portable, password-encrypted archive of active vault data and
                documents.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => {
                reset()
                setExportOpen(true)
              }}
            >
              <Download /> Export backup
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                reset()
                setRestoreOpen(true)
              }}
            >
              <ArchiveRestore /> Restore backup
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The archive is encrypted again with a separate password. Restore
            performs an additive merge and skips matching names to prevent
            common duplicates.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={exportOpen}
        onOpenChange={(next) => {
          if (!working) setExportOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export encrypted backup</DialogTitle>
            <DialogDescription>
              Choose a unique backup password. It cannot be recovered by the
              server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-password">Backup password</Label>
              <Input
                id="backup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-confirm">Confirm password</Label>
              <Input
                id="backup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            {progress && (
              <p className="flex items-center gap-2 text-sm text-primary">
                <LoaderCircle className="size-4 animate-spin" />{" "}
                {progressText(progress)}
              </p>
            )}
            {message && (
              <p className="rounded-lg bg-muted p-3 text-sm">{message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportOpen(false)}
              disabled={working}
            >
              Close
            </Button>
            <Button onClick={handleExport} disabled={working}>
              {working ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Download />
              )}{" "}
              Create backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={restoreOpen}
        onOpenChange={(next) => {
          if (!working) setRestoreOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore encrypted backup</DialogTitle>
            <DialogDescription>
              Items are merged into this vault. Matching categories and item
              names are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup file</Label>
              <Input
                ref={fileInput}
                id="backup-file"
                type="file"
                accept=".spvault,application/json"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restore-password">Backup password</Label>
              <Input
                id="restore-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            {progress && (
              <p className="flex items-center gap-2 text-sm text-primary">
                <LoaderCircle className="size-4 animate-spin" />{" "}
                {progressText(progress)}
              </p>
            )}
            {message && (
              <p className="rounded-lg bg-muted p-3 text-sm">{message}</p>
            )}
            {summary && (
              <div className="grid grid-cols-3 gap-2 rounded-xl border p-3 text-center text-xs">
                <div>
                  <strong className="block text-lg">{summary.created}</strong>
                  Created
                </div>
                <div>
                  <strong className="block text-lg">{summary.skipped}</strong>
                  Skipped
                </div>
                <div>
                  <strong className="block text-lg">{summary.documents}</strong>
                  Documents
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreOpen(false)}
              disabled={working}
            >
              Close
            </Button>
            <Button
              onClick={handleRestore}
              disabled={working || !file || !password}
            >
              {working ? <LoaderCircle className="animate-spin" /> : <Upload />}{" "}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
