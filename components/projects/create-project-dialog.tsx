"use client"

import { useEffect, useState } from "react"
import { AlertCircle, FolderGit2, Plus, ShieldCheck, Star } from "lucide-react"
import {
  createProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects"
import { encryptPayload } from "@/lib/crypto"
import type {
  DecryptedProject,
  DecryptedProjectPayload,
} from "@/lib/types/project"
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

export function CreateProjectDialog({
  editProject,
  onSaved,
}: {
  editProject?: DecryptedProject | null
  onSaved: () => void
}) {
  const { vaultKey, vaultId } = useVaultSessionStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [favorite, setFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editProject) return
    const timeoutId = window.setTimeout(() => {
      setName(editProject.payload.name || "")
      setDescription(editProject.payload.description || "")
      setWebsiteUrl(editProject.payload.websiteUrls?.[0] || "")
      setTagsInput(editProject.payload.tags?.join(", ") || "")
      setFavorite(editProject.payload.favorite || false)
      setOpen(true)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [editProject])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!vaultKey || !vaultId) return
    if (!name.trim()) {
      setError("Give this project a name before saving.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      const payload: DecryptedProjectPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        websiteUrls: websiteUrl.trim() ? [websiteUrl.trim()] : undefined,
        tags: parsedTags.length ? parsedTags : undefined,
        favorite,
        environments: editProject?.payload.environments ?? [
          { id: crypto.randomUUID(), name: "development", variables: [] },
        ],
      }
      const encrypted = await encryptPayload(payload, vaultKey)

      if (editProject) {
        const result = await updateProjectAction({
          id: editProject.id,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          version: editProject.version,
        })
        if (result.error) throw new Error(result.error)
      } else {
        const result = await createProjectAction({
          vaultId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        })
        if (result.error) throw new Error(result.error)
      }

      resetForm()
      setOpen(false)
      onSaved()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this project."
      )
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName("")
    setDescription("")
    setWebsiteUrl("")
    setTagsInput("")
    setFavorite(false)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus /> New Project
          </Button>
        }
      />

      <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-linear-to-r from-primary/8 via-primary/3 to-transparent px-5 py-5 pr-14 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <FolderGit2 className="size-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                {editProject ? "Edit project" : "New project"}
              </DialogTitle>
              <DialogDescription className="max-w-lg text-xs leading-relaxed sm:text-sm">
                {editProject
                  ? "Update project details. Environment variables are managed inside the project."
                  : "Group environment variables and secrets for one app, across multiple environments."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. my-saas-app or api-gateway"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-desc">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="project-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project?"
                className="h-10"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-website">
                  Repository / URL{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="project-website"
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-tags">
                  Tags{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="project-tags"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="work, client, internal"
                  className="h-10"
                />
              </div>
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
                : editProject
                  ? "Save changes"
                  : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
