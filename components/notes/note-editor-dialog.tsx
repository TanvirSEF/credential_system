"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  Eye,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { cn } from "@/lib/utils"
import { encryptPayload } from "@/lib/crypto"
import {
  createNoteAction,
  softDeleteNoteAction,
  updateNoteAction,
} from "@/lib/actions/notes"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import type { DecryptedNote, DecryptedNotePayload } from "@/lib/types/note"

export function NoteEditorDialog({
  note,
  isNew,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  note: DecryptedNote | null
  isNew: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const { vaultKey, vaultId } = useVaultSessionStore()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [favorite, setFavorite] = useState(false)
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(note?.payload.title ?? "")
      setContent(note?.payload.content ?? "")
      setTagsInput(note?.payload.tags?.join(", ") ?? "")
      setFavorite(note?.payload.favorite ?? false)
      setTab("write")
      setDirty(false)
      setError(null)
    }
  }, [open, note])

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

  async function handleSave() {
    if (!vaultKey || !vaultId) return
    if (!title.trim()) {
      setError("Give this note a title before saving.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      const payload: DecryptedNotePayload = {
        title: title.trim(),
        content,
        tags: parsedTags.length ? parsedTags : undefined,
        favorite,
      }
      const encrypted = await encryptPayload(payload, vaultKey)

      if (isNew) {
        const res = await createNoteAction({
          vaultId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        })
        if (res.error) throw new Error(res.error)
      } else if (note) {
        const res = await updateNoteAction({
          id: note.id,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          version: note.version,
        })
        if (res.error) throw new Error(res.error)
      }

      setDirty(false)
      onSaved()
      onOpenChange(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this note."
      )
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!note) return
    await softDeleteNoteAction(note.id)
    onOpenChange(false)
    onDeleted()
  }

  const canSave = isNew ? true : dirty

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-5 py-3 pr-14 sm:px-6">
            <div className="flex items-center gap-2">
              <input
                aria-label="Note title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setDirty(true)
                }}
                placeholder="Untitled note"
                className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                aria-label={favorite ? "Remove favorite" : "Add favorite"}
                onClick={() => {
                  setFavorite((f) => !f)
                  setDirty(true)
                }}
                className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
              >
                <Star
                  className={cn(
                    "size-5",
                    favorite && "fill-amber-400 text-amber-400"
                  )}
                />
              </button>
              {!isNew && (
                <button
                  type="button"
                  aria-label="Move to trash"
                  onClick={() => setDeleteOpen(true)}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-5" />
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="flex items-center gap-1 border-b bg-muted/30 px-5 py-1.5 sm:px-6">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                tab === "write"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pencil className="size-3.5" /> Write
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                tab === "preview"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3.5" /> Preview
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
            {error && (
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            {tab === "write" ? (
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setDirty(true)
                }}
                placeholder={
                  "# Heading\n\nWrite **Markdown** here — lists, `code`, and more.\n\n```js\nconsole.log('hi')\n```"
                }
                className="min-h-64 w-full resize-y rounded-lg border border-input bg-transparent p-3 font-mono text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            ) : content.trim() ? (
              <MarkdownPreview content={content} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground italic">
                Nothing to preview yet — switch to Write.
              </p>
            )}
          </div>

          <div className="border-t px-5 py-3 sm:px-6">
            <Input
              value={tagsInput}
              onChange={(e) => {
                setTagsInput(e.target.value)
                setDirty(true)
              }}
              placeholder="Tags (comma separated, optional)"
              className="h-9"
            />
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
                disabled={!canSave || saving}
                className="min-w-28"
              >
                {saving ? "Saving..." : isNew ? "Create note" : "Save changes"}
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
      {!isNew && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Move to Trash?"
          description="This note will be moved to Trash. You can restore it later."
          confirmLabel="Move to Trash"
          destructive
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}
