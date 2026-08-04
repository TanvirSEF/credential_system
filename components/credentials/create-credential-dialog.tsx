"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react"
import {
  createCredentialAction,
  updateCredentialAction,
} from "@/lib/actions/credentials"
import { createCredentialFields } from "@/lib/credential-templates"
import { encryptPayload } from "@/lib/crypto"
import type {
  CredentialField,
  DecryptedCredential,
  DecryptedCredentialPayload,
} from "@/lib/types/credential"
import type {
  DecryptedCredentialType,
  FieldType,
} from "@/lib/types/credential-template"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import {
  enqueueSyncJob,
  getCachedCredentials,
  setCachedCredentials,
} from "@/lib/storage/indexed-db"
import { flushSyncQueue } from "@/lib/sync-engine"
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
import { PasswordGeneratorDialog } from "@/components/credentials/password-generator-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FIELD_TYPE_LABELS: Partial<Record<FieldType, string>> = {
  text: "Text",
  password: "Password",
  multiline: "Long text",
  email: "Email",
  url: "URL",
  date: "Date",
  boolean: "Yes / No",
  select: "Choice",
}

export function CreateCredentialDialog({
  existingTypes,
  editCredential,
  onSaved,
}: {
  existingTypes: DecryptedCredentialType[]
  editCredential?: DecryptedCredential | null
  onSaved: () => void
}) {
  const { vaultKey, vaultId } = useVaultSessionStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [selectedTypeId, setSelectedTypeId] = useState("none")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [favorite, setFavorite] = useState(false)
  const [fields, setFields] = useState<CredentialField[]>([])
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedType = useMemo(
    () => existingTypes.find((type) => type.id === selectedTypeId),
    [existingTypes, selectedTypeId]
  )
  const selectedTypeLabel =
    selectedTypeId === "none"
      ? "General / Uncategorized"
      : selectedType?.payload.name || "Choose a category"

  useEffect(() => {
    if (!editCredential) return
    const timeoutId = window.setTimeout(() => {
      setTitle(editCredential.payload.title || "")
      setSubtitle(editCredential.payload.subtitle || "")
      setSelectedTypeId(editCredential.typeId || "none")
      setWebsiteUrl(editCredential.payload.websiteUrls?.[0] || "")
      setNotes(editCredential.payload.notes || "")
      setTagsInput(editCredential.payload.tags?.join(", ") || "")
      setFavorite(editCredential.payload.favorite || false)
      setFields(editCredential.payload.fields || [])
      setOpen(true)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [editCredential])

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && !editCredential && fields.length === 0) {
      setFields(createCredentialFields())
    }
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleTypeChange(typeId: string) {
    setSelectedTypeId(typeId)
    if (!editCredential) {
      const category = existingTypes.find((type) => type.id === typeId)
      setFields(createCredentialFields(category))
      setVisibleSecrets(new Set())
    }
  }

  function addCustomField() {
    setFields((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "",
        type: "text",
        value: "",
        secret: false,
        copyable: true,
      },
    ])
  }

  function removeField(id: string) {
    setFields((current) => current.filter((field) => field.id !== id))
  }

  function updateField(id: string, updates: Partial<CredentialField>) {
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    )
  }

  function toggleSecretVisibility(id: string) {
    setVisibleSecrets((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!vaultKey || !vaultId) return
    if (!title.trim()) {
      setError("Give this credential a name before saving.")
      return
    }
    if (fields.some((field) => !field.label.trim())) {
      setError("Every private field needs a name.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      const payload: DecryptedCredentialPayload = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        typeId: selectedTypeId === "none" ? undefined : selectedTypeId,
        fields,
        websiteUrls: websiteUrl.trim() ? [websiteUrl.trim()] : undefined,
        notes: notes.trim() || undefined,
        tags: parsedTags.length ? parsedTags : undefined,
        favorite,
      }
      const encrypted = await encryptPayload(payload, vaultKey)

      const isOnline = navigator.onLine

      if (isOnline) {
        if (editCredential) {
          const result = await updateCredentialAction({
            id: editCredential.id,
            typeId: selectedTypeId === "none" ? undefined : selectedTypeId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            version: editCredential.version,
          })
          if (result.error) throw new Error(result.error)
        } else {
          const result = await createCredentialAction({
            vaultId,
            typeId: selectedTypeId === "none" ? undefined : selectedTypeId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
          })
          if (result.error) throw new Error(result.error)
        }
      } else {
        const tempId = editCredential ? editCredential.id : crypto.randomUUID()
        const typeId = selectedTypeId === "none" ? undefined : selectedTypeId

        if (editCredential) {
          await enqueueSyncJob("UPDATE_CREDENTIAL", {
            id: editCredential.id,
            typeId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            version: editCredential.version,
          })
        } else {
          await enqueueSyncJob("CREATE_CREDENTIAL", {
            id: tempId,
            vaultId,
            typeId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
          })
        }

        const existing = await getCachedCredentials(vaultId)
        if (editCredential) {
          await setCachedCredentials(
            vaultId,
            existing.map((c) =>
              c.id === editCredential.id
                ? {
                    ...c,
                    typeId: typeId || null,
                    payloadCiphertext: encrypted.ciphertext,
                    iv: encrypted.iv,
                    version: editCredential.version + 1,
                    updatedAt: new Date(),
                  }
                : c
            )
          )
        } else {
          await setCachedCredentials(vaultId, [
            ...existing,
            {
              id: tempId,
              vaultId,
              typeId: typeId || null,
              payloadCiphertext: encrypted.ciphertext,
              iv: encrypted.iv,
              cryptoVersion: 1,
              version: 1,
              deletedAt: null,
              updatedAt: new Date(),
            },
          ])
        }

        flushSyncQueue()
      }

      resetForm()
      setOpen(false)
      onSaved()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this credential."
      )
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle("")
    setSubtitle("")
    setSelectedTypeId("none")
    setWebsiteUrl("")
    setNotes("")
    setTagsInput("")
    setFavorite(false)
    setFields([])
    setVisibleSecrets(new Set())
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus /> Add Credential
          </Button>
        }
      />

      <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent px-5 py-5 pr-14 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                {editCredential ? "Edit credential" : "Add a credential"}
              </DialogTitle>
              <DialogDescription className="max-w-lg text-xs leading-relaxed sm:text-sm">
                {editCredential
                  ? "Update the details below. Your changes will be encrypted again before saving."
                  : "Save a password, API key, Wi-Fi login, or any private account securely."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Credential name</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Home Wi-Fi or GitHub account"
                  className="h-10"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="category">Category</Label>
                  <span className="text-[11px] text-muted-foreground">
                    Controls the fields below
                  </span>
                </div>
                <Select
                  value={selectedTypeId}
                  onValueChange={(value) => handleTypeChange(value || "none")}
                >
                  <SelectTrigger id="category" className="h-10 w-full">
                    <SelectValue>{selectedTypeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      General / Uncategorized
                    </SelectItem>
                    {existingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.payload.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType?.payload.description && (
                  <p className="text-xs text-muted-foreground">
                    {selectedType.payload.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Username or account</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  placeholder="name@example.com"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">
                  Website{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="h-10"
                />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">
                    Private credential fields
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    These values are encrypted before upload.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                >
                  <Plus /> Add field
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background/60 px-4 py-6 text-center">
                  <KeyRound className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-xs font-medium">No private fields yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a category or add your own field.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <CredentialFieldEditor
                      key={field.id}
                      field={field}
                      secretVisible={visibleSecrets.has(field.id)}
                      onChange={(updates) => updateField(field.id, updates)}
                      onRemove={() => removeField(field.id)}
                      onToggleSecret={() => toggleSecretVisibility(field.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 border-t pt-5">
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Private notes{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add encrypted notes, recovery details, or instructions..."
                  className="min-h-24 w-full resize-y rounded-xl border border-input bg-transparent p-3 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="tags">
                    Tags{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="tags"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="work, personal, important"
                    className="h-10"
                  />
                </div>

                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={favorite}
                    onChange={(event) => setFavorite(event.target.checked)}
                    className="size-4 cursor-pointer accent-primary"
                  />
                  <Star
                    className={`size-4 ${favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  />
                  Favorite
                </label>
              </div>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="mr-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <ShieldCheck className="size-4 text-emerald-500" />
              Encrypted on this device
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="min-w-24"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-36">
              {loading
                ? "Encrypting & saving..."
                : editCredential
                  ? "Save changes"
                  : "Save credential"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CredentialFieldEditor({
  field,
  secretVisible,
  onChange,
  onRemove,
  onToggleSecret,
}: {
  field: CredentialField
  secretVisible: boolean
  onChange: (updates: Partial<CredentialField>) => void
  onRemove: () => void
  onToggleSecret: () => void
}) {
  const valueId = `field-value-${field.id}`
  const typeLabel = FIELD_TYPE_LABELS[field.type] || "Text"
  const inputType =
    field.secret && !secretVisible
      ? "password"
      : field.type === "email" || field.type === "url" || field.type === "date"
        ? field.type
        : "text"

  return (
    <div className="space-y-3 rounded-xl border bg-background p-3.5 shadow-xs">
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-1.5">
            <Label htmlFor={`field-label-${field.id}`} className="text-xs">
              Field name
            </Label>
            <Input
              id={`field-label-${field.id}`}
              value={field.label}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder="e.g. Password"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={valueId} className="text-xs">
              Value{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              {field.type === "multiline" ? (
                <textarea
                  id={valueId}
                  required={field.required}
                  value={field.value}
                  onChange={(event) => onChange({ value: event.target.value })}
                  placeholder={`Enter ${field.label || "value"}`}
                  className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              ) : field.type === "boolean" ? (
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
                  <input
                    id={valueId}
                    type="checkbox"
                    checked={field.value === "true"}
                    onChange={(event) =>
                      onChange({ value: String(event.target.checked) })
                    }
                    className="size-4 cursor-pointer accent-primary"
                  />
                  {field.value === "true" ? "Yes" : "No"}
                </label>
              ) : field.type === "select" && field.options?.length ? (
                <select
                  id={valueId}
                  required={field.required}
                  value={field.value}
                  onChange={(event) => onChange({ value: event.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Choose an option</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={valueId}
                  required={field.required}
                  type={inputType}
                  value={field.value}
                  onChange={(event) => onChange({ value: event.target.value })}
                  placeholder={`Enter ${field.label || "value"}`}
                  className={`h-9 ${field.type === "password" ? "pr-18" : "pr-10"}`}
                />
              )}
              {field.type === "password" && (
                <div className="absolute top-1/2 right-8 -translate-y-1/2">
                  <PasswordGeneratorDialog
                    onUse={(password) =>
                      onChange({ value: password, secret: true })
                    }
                  />
                </div>
              )}
              {field.secret &&
                field.type !== "multiline" &&
                field.type !== "boolean" && (
                  <button
                    type="button"
                    aria-label={secretVisible ? "Hide secret" : "Show secret"}
                    onClick={onToggleSecret}
                    className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {secretVisible ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                )}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${field.label || "field"}`}
          onClick={onRemove}
          className="mt-5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={field.secret}
            onChange={(event) => onChange({ secret: event.target.checked })}
            className="size-4 cursor-pointer accent-primary"
          />
          Hide as a secret
        </label>
        <Select
          value={field.type}
          onValueChange={(value) =>
            onChange({ type: (value || "text") as FieldType })
          }
        >
          <SelectTrigger className="h-8 w-[145px]">
            <SelectValue>{typeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="password">Password</SelectItem>
            <SelectItem value="multiline">Long text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="boolean">Yes / No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
