"use client"

import { useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  FileLock2,
  FileUp,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react"
import {
  createDocumentRecordAction,
  createDocumentUploadUrlAction,
} from "@/lib/actions/documents"
import { encryptFile } from "@/lib/crypto/file-crypto"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_DOCUMENT_CIPHERTEXT_BYTES } from "@/lib/actions/validation"

type UploadPhase = "idle" | "encrypting" | "uploading" | "saving"

interface UploadDocumentDialogProps {
  onUploaded: () => void
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function uploadErrorMessage(caughtError: unknown): string {
  if (
    caughtError instanceof TypeError &&
    caughtError.message === "Failed to fetch"
  ) {
    return "The browser could not reach private storage. Check that this site's exact origin is allowed in the bucket CORS policy, then try again."
  }

  return caughtError instanceof Error
    ? caughtError.message
    : "The encrypted document could not be uploaded."
}

export function UploadDocumentDialog({
  onUploaded,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<UploadPhase>("idle")
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { vaultKey, vaultId } = useVaultSessionStore()
  const uploading = phase !== "idle"

  function resetForm() {
    setFile(null)
    setDescription("")
    setError(null)
    setPhase("idle")
    setDragActive(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(nextOpen: boolean) {
    if (uploading && !nextOpen) return
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) return
    if (nextFile.size === 0) {
      setFile(null)
      setError("This file is empty. Choose a file that contains data.")
      return
    }
    if (nextFile.size + 16 > MAX_DOCUMENT_CIPHERTEXT_BYTES) {
      setFile(null)
      setError("Documents must be 50 MB or smaller before encryption.")
      return
    }
    setFile(nextFile)
    setError(null)
  }

  function removeFile() {
    setFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!file) {
      setError("Choose a document before uploading.")
      return
    }
    if (!vaultKey || !vaultId) {
      setError("Your vault is locked. Unlock it and try again.")
      return
    }

    try {
      setPhase("encrypting")
      const encryptedData = await encryptFile(file, vaultKey, description)

      setPhase("uploading")
      const urlResult = await createDocumentUploadUrlAction(
        vaultId,
        encryptedData.ciphertextSize
      )
      if (urlResult.error || !urlResult.uploadUrl || !urlResult.storagePath) {
        throw new Error(
          urlResult.error || "Could not prepare the private upload."
        )
      }

      const uploadResult = await fetch(urlResult.uploadUrl, {
        method: "PUT",
        body: encryptedData.ciphertextBuffer,
        headers: { "Content-Type": "application/octet-stream" },
      })
      if (!uploadResult.ok) {
        throw new Error(
          `Private storage rejected the upload (${uploadResult.status}).`
        )
      }

      setPhase("saving")
      const recordResult = await createDocumentRecordAction({
        vaultId,
        storagePath: urlResult.storagePath,
        metadataCiphertext: encryptedData.metadataCiphertext,
        metadataIv: encryptedData.metadataIv,
        ciphertextSha256: encryptedData.ciphertextSha256,
        ciphertextSize: encryptedData.ciphertextSize,
      })
      if (recordResult.error) throw new Error(recordResult.error)

      resetForm()
      setOpen(false)
      onUploaded()
    } catch (caughtError) {
      setError(uploadErrorMessage(caughtError))
      setPhase("idle")
    }
  }

  const phaseLabel =
    phase === "encrypting"
      ? "Encrypting in your browser..."
      : phase === "uploading"
        ? "Sending encrypted data..."
        : phase === "saving"
          ? "Verifying and finishing..."
          : "Encrypt & upload"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <FileUp /> Upload Document
          </Button>
        }
      />

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent px-5 py-5 pr-14 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <FileLock2 className="size-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                Upload a private document
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed sm:text-sm">
                The original file is encrypted on this device before anything is
                uploaded.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="doc-file">Document</Label>
              <input
                ref={fileInputRef}
                id="doc-file"
                type="file"
                required={!file}
                disabled={uploading}
                className="sr-only"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />

              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <FileLock2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {file.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {file.type && (
                        <>
                          <span>·</span>
                          <span className="truncate">{file.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove selected file"
                    disabled={uploading}
                    onClick={removeFile}
                    className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="doc-file"
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    setDragActive(false)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragActive(false)
                    selectFile(event.dataTransfer.files?.[0])
                  }}
                  className={`group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-7 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/[0.08]"
                      : "border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/[0.04]"
                  }`}
                >
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl border bg-background text-primary shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <UploadCloud className="size-5" />
                  </div>
                  <p className="text-sm font-semibold">
                    Drop a file here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Documents, images, certificates, backups, or any private
                    file
                  </p>
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-desc">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="doc-desc"
                className="h-10"
                placeholder="e.g. Passport scan or Tax return 2025"
                value={description}
                disabled={uploading}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/20 p-3 text-center">
              <SecurityNote icon={<LockKeyhole />} label="Local encryption" />
              <SecurityNote icon={<ShieldCheck />} label="Private storage" />
              <SecurityNote icon={<CheckCircle2 />} label="Integrity checked" />
            </div>

            {uploading && (
              <div className="space-y-2" role="status" aria-live="polite">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <LoaderCircle className="size-4 animate-spin" />
                  {phaseLabel}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full bg-primary transition-[width] duration-500 ${
                      phase === "encrypting"
                        ? "w-1/3"
                        : phase === "uploading"
                          ? "w-2/3"
                          : "w-full"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
              className="min-w-24"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !file}
              className="min-w-40"
            >
              {uploading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LockKeyhole />
              )}
              {phaseLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SecurityNote({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-1 text-[10px] text-muted-foreground sm:text-[11px]">
      <span className="text-emerald-500 [&>svg]:size-3.5">{icon}</span>
      <span className="leading-tight">{label}</span>
    </div>
  )
}
