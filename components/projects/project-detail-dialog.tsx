"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { encryptPayload } from "@/lib/crypto"
import {
  softDeleteProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects"
import { parseEnvText, serializeEnv } from "@/lib/env-parse"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import type {
  DecryptedProject,
  DecryptedProjectPayload,
  ProjectEnvironment,
  ProjectVariable,
} from "@/lib/types/project"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  onDeleted,
  onSaved,
  onEdit,
}: {
  project: DecryptedProject | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
  onSaved: (updated: DecryptedProject) => void
  onEdit: (project: DecryptedProject) => void
}) {
  const { vaultKey } = useVaultSessionStore()
  const [draft, setDraft] = useState<DecryptedProjectPayload | null>(null)
  const [activeEnvId, setActiveEnvId] = useState<string>("")
  const [renamingEnv, setRenamingEnv] = useState(false)
  const [envNameDraft, setEnvNameDraft] = useState("")
  const [addingEnv, setAddingEnv] = useState(false)
  const [newEnvName, setNewEnvName] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open && project) {
      setDraft(structuredClone(project.payload))
      setActiveEnvId(project.payload.environments[0]?.id ?? "")
      setRenamingEnv(false)
      setAddingEnv(false)
      setImportOpen(false)
      setImportText("")
      setRevealedFields(new Set())
      setCopiedId(null)
      setDirty(false)
      setError(null)
    }
  }, [open, project])

  useEffect(() => {
    return () => {
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    }
  }, [])

  if (!project || !draft) return null

  const environments = draft.environments
  const activeEnv =
    environments.find((e) => e.id === activeEnvId) ?? environments[0]

  function commit(
    mutator: (d: DecryptedProjectPayload) => DecryptedProjectPayload
  ) {
    setDraft((prev) => (prev ? mutator(prev) : prev))
    setDirty(true)
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  function confirmDiscard() {
    onOpenChange(false)
  }

  function copyValue(id: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2500)
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    clipboardTimer.current = setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {})
    }, 20000)
  }

  function addVariable() {
    if (!activeEnv) return
    const variable: ProjectVariable = {
      id: crypto.randomUUID(),
      key: "",
      value: "",
      secret: false,
      enabled: true,
    }
    commit((d) => ({
      ...d,
      environments: d.environments.map((e) =>
        e.id === activeEnv.id
          ? { ...e, variables: [...e.variables, variable] }
          : e
      ),
    }))
  }

  function updateVariable(id: string, updates: Partial<ProjectVariable>) {
    if (!activeEnv) return
    commit((d) => ({
      ...d,
      environments: d.environments.map((e) =>
        e.id === activeEnv.id
          ? {
              ...e,
              variables: e.variables.map((v) =>
                v.id === id ? { ...v, ...updates } : v
              ),
            }
          : e
      ),
    }))
  }

  function removeVariable(id: string) {
    if (!activeEnv) return
    commit((d) => ({
      ...d,
      environments: d.environments.map((e) =>
        e.id === activeEnv.id
          ? { ...e, variables: e.variables.filter((v) => v.id !== id) }
          : e
      ),
    }))
  }

  function commitAddEnv() {
    const name = newEnvName.trim() || "environment"
    const env: ProjectEnvironment = {
      id: crypto.randomUUID(),
      name,
      variables: [],
    }
    commit((d) => ({ ...d, environments: [...d.environments, env] }))
    setActiveEnvId(env.id)
    setNewEnvName("")
    setAddingEnv(false)
  }

  function commitRenameEnv() {
    if (!activeEnv) return
    const name = envNameDraft.trim()
    if (!name) {
      setRenamingEnv(false)
      return
    }
    commit((d) => ({
      ...d,
      environments: d.environments.map((e) =>
        e.id === activeEnv.id ? { ...e, name } : e
      ),
    }))
    setRenamingEnv(false)
  }

  function deleteEnv(id: string) {
    if (environments.length <= 1) return
    const next = environments.filter((e) => e.id !== id)
    commit((d) => ({
      ...d,
      environments: d.environments.filter((e) => e.id !== id),
    }))
    if (activeEnvId === id) setActiveEnvId(next[0].id)
  }

  function handleImport() {
    if (!activeEnv) return
    const parsed = parseEnvText(importText)
    if (parsed.length === 0) {
      setError("No valid KEY=value lines found to import.")
      return
    }
    commit((d) => ({
      ...d,
      environments: d.environments.map((e) => {
        if (e.id !== activeEnv.id) return e
        const existingByKey = new Map(e.variables.map((v) => [v.key, v]))
        const merged: ProjectVariable[] = [...e.variables]
        for (const incoming of parsed) {
          const found = existingByKey.get(incoming.key)
          if (found) {
            const idx = merged.findIndex((v) => v.id === found.id)
            merged[idx] = {
              ...found,
              value: incoming.value,
              enabled: found.enabled && incoming.enabled,
            }
          } else {
            merged.push(incoming)
          }
        }
        return { ...e, variables: merged }
      }),
    }))
    setImportText("")
    setImportOpen(false)
    setError(null)
  }

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImportText(String(reader.result ?? ""))
      setError(null)
    }
    reader.onerror = () => setError("Could not read that file.")
    reader.readAsText(file)
    event.target.value = ""
  }

  function handleCopyEnv() {
    if (!activeEnv) return
    copyValue(`env-${activeEnv.id}`, serializeEnv(activeEnv))
  }

  function handleDownloadEnv() {
    if (!activeEnv || !draft) return
    const blob = new Blob([serializeEnv(activeEnv)], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${slugify(draft.name)}-${slugify(activeEnv.name)}.env`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSave() {
    if (!vaultKey || !project || !draft) return
    const invalidKey = activeEnv?.variables.some(
      (v) => v.enabled && !v.key.trim()
    )
    if (invalidKey) {
      setError("Every enabled variable needs a key.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const encrypted = await encryptPayload(draft, vaultKey)
      const result = await updateProjectAction({
        id: project.id,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: project.version,
      })
      if (result.error) throw new Error(result.error)
      const updated: DecryptedProject = {
        ...project,
        payload: draft,
        version: project.version + 1,
        updatedAt: new Date(),
      }
      setDirty(false)
      onSaved(updated)
      onOpenChange(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save changes."
      )
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!project) return
    await softDeleteProjectAction(project.id)
    onOpenChange(false)
    onDeleted()
  }

  function toggleReveal(id: string) {
    setRevealedFields((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b bg-linear-to-r from-primary/8 via-primary/3 to-transparent px-5 py-4 pr-14 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="flex items-center gap-2 truncate text-lg font-bold">
                  {draft.name}
                  <button
                    type="button"
                    aria-label={
                      draft.favorite ? "Remove favorite" : "Add favorite"
                    }
                    onClick={() =>
                      commit((d) => ({ ...d, favorite: !d.favorite }))
                    }
                    className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted"
                  >
                    <Star
                      className={cn(
                        "size-4",
                        draft.favorite && "fill-amber-400 text-amber-400"
                      )}
                    />
                  </button>
                </DialogTitle>
                {draft.description && (
                  <DialogDescription className="truncate">
                    {draft.description}
                  </DialogDescription>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(project)
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-5 py-2.5 sm:px-6">
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {environments.map((env) => (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => {
                    setActiveEnvId(env.id)
                    setRenamingEnv(false)
                    setAddingEnv(false)
                  }}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
                    env.id === activeEnv?.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {env.name}
                  <span className="text-[10px] opacity-70">
                    {env.variables.length}
                  </span>
                </button>
              ))}
              {addingEnv ? (
                <span className="inline-flex items-center gap-1">
                  <Input
                    autoFocus
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitAddEnv()
                      if (e.key === "Escape") setAddingEnv(false)
                    }}
                    placeholder="env name"
                    className="h-8 w-28 text-xs"
                  />
                  <Button size="xs" onClick={commitAddEnv}>
                    Add
                  </Button>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setAddingEnv(true)}
                >
                  <Plus /> Env
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" onClick={handleCopyEnv}>
                <Copy /> .env
              </Button>
              <Button variant="outline" size="xs" onClick={handleDownloadEnv}>
                <Download />
              </Button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
            {error && (
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            {activeEnv && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {renamingEnv ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={envNameDraft}
                      onChange={(e) => setEnvNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRenameEnv()
                        if (e.key === "Escape") setRenamingEnv(false)
                      }}
                      className="h-8 w-40 text-sm"
                    />
                    <Button size="xs" onClick={commitRenameEnv}>
                      Save
                    </Button>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{activeEnv.name}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEnvNameDraft(activeEnv.name)
                        setRenamingEnv(true)
                      }}
                      className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Rename
                    </button>
                    {environments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteEnv(activeEnv.id)}
                        className="cursor-pointer text-xs text-destructive underline-offset-2 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setImportOpen((v) => !v)}
                >
                  <Upload /> Import .env
                </Button>
              </div>
            )}

            {importOpen && (
              <div className="mb-4 space-y-2 rounded-xl border bg-muted/20 p-3">
                <Label className="text-xs">
                  Import an <code>.env</code> file
                </Label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-background/60 px-4 py-4 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                  <Upload className="size-4" />
                  Choose <code>.env</code> file
                  <input
                    type="file"
                    accept=".env,.txt,text/plain"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
                <textarea
                  id="env-import"
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    "DATABASE_URL=postgres://...\nSTRIPE_KEY=sk_live_...\n# DEBUG=true"
                  }
                  className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent p-3 font-mono text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
                <p className="text-[10px] text-muted-foreground">
                  New keys are appended; existing keys update their value.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setImportOpen(false)
                      setImportText("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleImport}
                    disabled={!importText.trim()}
                  >
                    Parse &amp; import
                  </Button>
                </div>
              </div>
            )}

            {activeEnv && activeEnv.variables.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background/60 px-4 py-8 text-center">
                <p className="text-xs font-medium">No variables yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add one manually or import an existing .env.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeEnv?.variables.map((v) => {
                  const revealed = revealedFields.has(v.id)
                  const displayValue =
                    v.secret && !revealed ? "••••••••" : v.value
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2.5",
                        !v.enabled && "opacity-55"
                      )}
                    >
                      <button
                        type="button"
                        aria-label={v.enabled ? "Disable" : "Enable"}
                        onClick={() =>
                          updateVariable(v.id, { enabled: !v.enabled })
                        }
                        className={cn(
                          "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors",
                          v.enabled
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-transparent"
                        )}
                      >
                        {v.enabled && <Check className="size-3" />}
                      </button>

                      <Input
                        value={v.key}
                        onChange={(e) =>
                          updateVariable(v.id, { key: e.target.value })
                        }
                        placeholder="KEY"
                        className="h-8 w-32 flex-1 font-mono text-xs sm:w-40"
                      />

                      <div className="relative min-w-0 flex-1">
                        <Input
                          value={displayValue}
                          onChange={(e) =>
                            updateVariable(v.id, { value: e.target.value })
                          }
                          placeholder="value"
                          readOnly={v.secret && !revealed}
                          className="h-8 pr-16 font-mono text-xs"
                        />
                        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5">
                          {v.secret && (
                            <button
                              type="button"
                              aria-label={revealed ? "Hide" : "Reveal"}
                              onClick={() => toggleReveal(v.id)}
                              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {revealed ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Copy value"
                            onClick={() => copyValue(v.id, v.value)}
                            className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {copiedId === v.id ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={v.secret ? "Not secret" : "Mark secret"}
                        onClick={() =>
                          updateVariable(v.id, { secret: !v.secret })
                        }
                        className={cn(
                          "cursor-pointer rounded px-1.5 py-1 text-[10px] font-semibold transition-colors",
                          v.secret
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {v.secret ? "SECRET" : "plain"}
                      </button>

                      <button
                        type="button"
                        aria-label="Remove variable"
                        onClick={() => removeVariable(v.id)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={addVariable}
              className="mt-3 w-full border-dashed"
            >
              <Plus /> Add variable
            </Button>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
              {dirty ? (
                <span className="font-medium text-amber-600">
                  Unsaved changes
                </span>
              ) : (
                <span>Encrypted on this device</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="min-w-20"
              >
                {dirty ? "Discard" : "Close"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="min-w-28"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description="Your unsaved changes will be lost. This cannot be undone."
        confirmLabel="Discard"
        destructive
        onConfirm={confirmDiscard}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Move to Trash?"
        description="This project will be moved to Trash. You can restore it later."
        confirmLabel="Move to Trash"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  )
}
