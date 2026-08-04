"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  Copy,
  FileText,
  FolderGit2,
  KeyRound,
  ListTodo,
  LoaderCircle,
  Search,
  StickyNote,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import {
  loadDecryptedVaultIndex,
  type DecryptedVaultIndex,
} from "@/lib/vault/decrypted-index"
import { subscribeBroadcast } from "@/lib/storage/broadcast-channel"

interface SearchResult {
  id: string
  kind: "credential" | "project" | "note" | "document" | "task"
  title: string
  detail: string
  haystack: string
  href: string
  copyValue?: string
}

const ICONS = {
  credential: KeyRound,
  project: FolderGit2,
  note: StickyNote,
  document: FileText,
  task: ListTodo,
}

function buildResults(index: DecryptedVaultIndex): SearchResult[] {
  return [
    ...index.credentials.map((item) => ({
      id: item.id,
      kind: "credential" as const,
      title: item.payload.title,
      detail:
        item.payload.subtitle || item.payload.websiteUrls?.[0] || "Credential",
      haystack: [
        item.payload.title,
        item.payload.subtitle,
        ...(item.payload.tags || []),
        ...(item.payload.websiteUrls || []),
        ...item.payload.fields.map((field) => field.label),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      href: "/dashboard/credentials",
      copyValue: item.payload.fields.find((field) => field.type === "password")
        ?.value,
    })),
    ...index.projects.map((item) => ({
      id: item.id,
      kind: "project" as const,
      title: item.payload.name,
      detail: item.payload.description || "Project",
      haystack: [
        item.payload.name,
        item.payload.description,
        ...(item.payload.tags || []),
        ...item.payload.environments.flatMap((environment) =>
          environment.variables.map((variable) => variable.key)
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      href: "/dashboard/projects",
    })),
    ...index.notes.map((item) => ({
      id: item.id,
      kind: "note" as const,
      title: item.payload.title,
      detail:
        item.payload.content
          .replace(/[#*_`]/g, " ")
          .trim()
          .slice(0, 90) || "Note",
      haystack: [
        item.payload.title,
        item.payload.content,
        ...(item.payload.tags || []),
      ]
        .join(" ")
        .toLowerCase(),
      href: "/dashboard/notes",
    })),
    ...index.documents.map((item) => ({
      id: item.id,
      kind: "document" as const,
      title: item.metadata.originalName,
      detail: item.metadata.description || item.metadata.mimeType,
      haystack: [
        item.metadata.originalName,
        item.metadata.description,
        item.metadata.mimeType,
        ...(item.metadata.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      href: "/dashboard/documents",
    })),
    ...index.tasks.map((item) => ({
      id: item.id,
      kind: "task" as const,
      title: item.payload.title,
      detail: item.payload.dueDate
        ? `Due ${new Date(item.payload.dueDate).toLocaleString()}`
        : (item.payload.description
            ?.replace(/[#*_`]/g, " ")
            .trim()
            .slice(0, 90) ||
            "Task"),
      haystack: [
        item.payload.title,
        item.payload.description,
        ...(item.payload.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      href: "/dashboard/tasks",
    })),
  ]
}

export function GlobalVaultSearch() {
  const router = useRouter()
  const { vaultId, vaultKey, isUnlocked } = useVaultSessionStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState<DecryptedVaultIndex | null>(null)
  const [loadedVaultId, setLoadedVaultId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function ensureIndex() {
    if (!vaultId || !vaultKey || (index && loadedVaultId === vaultId)) return
    setLoading(true)
    setError(null)
    try {
      setIndex(await loadDecryptedVaultIndex(vaultId, vaultKey))
      setLoadedVaultId(vaultId)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Search index could not be loaded."
      )
    } finally {
      setLoading(false)
    }
  }

  function openSearch() {
    if (!isUnlocked) return
    setOpen(true)
    void ensureIndex()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openSearch()
      }
    }
    const handleOpen = () => openSearch()
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("spv:open-search", handleOpen)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("spv:open-search", handleOpen)
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    }
  })

  useEffect(() => {
    return subscribeBroadcast((message) => {
      if (message.type === "CACHE_INVALIDATED") setIndex(null)
      if (message.type === "VAULT_LOCKED") {
        setIndex(null)
        setOpen(false)
        setQuery("")
      }
    }, true)
  }, [])

  const results = useMemo(() => {
    if (!index) return []
    const normalizedQuery = query.trim().toLowerCase()
    const all = buildResults(index)
    return (
      normalizedQuery
        ? all.filter((item) => item.haystack.includes(normalizedQuery))
        : all
    ).slice(0, 30)
  }, [index, query])

  async function copySecret(result: SearchResult) {
    if (!result.copyValue) return
    await navigator.clipboard.writeText(result.copyValue)
    setCopiedId(result.id)
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    clipboardTimer.current = setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {})
      setCopiedId(null)
    }, 20_000)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <DialogContent className="top-[10%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search vault</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 border-b pl-4 pr-12">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search credentials, projects, notes, and documents..."
            className="h-14 min-w-0 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Building private
              search index...
            </div>
          ) : error ? (
            <p className="m-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : results.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No matching vault items.
            </p>
          ) : (
            results.map((result) => {
              const Icon = ICONS[result.kind]
              return (
                <div
                  key={`${result.kind}:${result.id}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/70"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      router.push(result.href)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold">
                      {result.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.detail}
                    </p>
                  </button>
                  {result.copyValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Copy password for ${result.title}`}
                      onClick={() => copySecret(result)}
                    >
                      {copiedId === result.id ? (
                        <Check className="text-emerald-500" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
        <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          Up to 30 results · Secrets are never included in search text · Copied
          passwords clear after 20 seconds
        </div>
      </DialogContent>
    </Dialog>
  )
}
