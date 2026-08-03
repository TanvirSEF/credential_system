"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload, encryptPayload } from "@/lib/crypto"
import { fetchNotesAction, updateNoteAction } from "@/lib/actions/notes"
import { setCachedNotes, getCachedNotes } from "@/lib/storage/indexed-db"
import {
  subscribeBroadcast,
  broadcastMessage,
} from "@/lib/storage/broadcast-channel"
import { NoteCard } from "@/components/notes/note-card"
import { NoteRow } from "@/components/notes/note-row"
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { DecryptedNote, DecryptedNotePayload } from "@/lib/types/note"
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  StickyNote,
  Star,
  Plus,
} from "lucide-react"

type SortBy = "name-asc" | "name-desc" | "updated"

const SORT_LABELS: Record<SortBy, string> = {
  "name-asc": "Title (A–Z)",
  "name-desc": "Title (Z–A)",
  updated: "Recently updated",
}

function compareNotes(a: DecryptedNote, b: DecryptedNote, sortBy: SortBy) {
  if (sortBy === "name-asc" || sortBy === "name-desc") {
    const fa = a.payload.favorite ? 1 : 0
    const fb = b.payload.favorite ? 1 : 0
    if (fa !== fb) return fb - fa
  }
  switch (sortBy) {
    case "name-asc":
      return a.payload.title.localeCompare(b.payload.title)
    case "name-desc":
      return b.payload.title.localeCompare(a.payload.title)
    case "updated":
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    default:
      return 0
  }
}

function NotesContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [notesList, setNotesList] = useState<DecryptedNote[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("name-asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)

  const loadData = useCallback(async () => {
    if (!vaultId || !vaultKey) return

    const cachedRows = await getCachedNotes(vaultId)
    if (cachedRows.length > 0) {
      const decryptedCached = await Promise.all(
        cachedRows.map(async (c) => ({
          id: c.id,
          vaultId: c.vaultId,
          ownerId: "",
          deletedAt: c.deletedAt,
          version: c.version,
          createdAt: new Date(),
          updatedAt: c.updatedAt,
          payload: await decryptPayload<DecryptedNotePayload>(
            {
              ciphertext: c.payloadCiphertext,
              iv: c.iv,
              cryptoVersion: c.cryptoVersion,
              schemaVersion: 1,
            },
            vaultKey
          ),
        }))
      )
      setNotesList(decryptedCached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const res = await fetchNotesAction(vaultId)
    if (res.notes && res.notes.length > 0) {
      const decrypted = await Promise.all(
        res.notes.map(async (n) => ({
          id: n.id,
          vaultId: n.vaultId,
          ownerId: n.ownerId,
          deletedAt: n.deletedAt,
          version: n.version,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          payload: await decryptPayload<DecryptedNotePayload>(
            {
              ciphertext: n.payloadCiphertext,
              iv: n.iv,
              cryptoVersion: n.cryptoVersion,
              schemaVersion: n.schemaVersion,
            },
            vaultKey
          ),
        }))
      )
      setNotesList(decrypted)

      setCachedNotes(
        vaultId,
        res.notes.map((n) => ({
          id: n.id,
          vaultId: n.vaultId,
          payloadCiphertext: n.payloadCiphertext,
          iv: n.iv,
          cryptoVersion: n.cryptoVersion,
          version: n.version,
          deletedAt: n.deletedAt,
          updatedAt: n.updatedAt,
        }))
      )
    } else {
      setNotesList([])
      setCachedNotes(vaultId, [])
    }

    setLoading(false)
  }, [vaultId, vaultKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return subscribeBroadcast((msg) => {
      if (msg.type === "CACHE_INVALIDATED") {
        loadData()
      }
    })
  }, [loadData])

  useEffect(() => {
    return () => {
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    }
  }, [])

  const favoritesCount = useMemo(
    () => notesList.filter((n) => n.payload.favorite).length,
    [notesList]
  )

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = notesList.filter((item) => {
      if (favoritesOnly && !item.payload.favorite) return false
      if (query) {
        const haystack = [
          item.payload.title,
          item.payload.content,
          ...(item.payload.tags ?? []),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
    return filtered.slice().sort((a, b) => compareNotes(a, b, sortBy))
  }, [notesList, searchQuery, favoritesOnly, sortBy])

  function handleOpen(note: DecryptedNote) {
    setSelectedNote(note)
    setIsNew(false)
    setEditorOpen(true)
  }

  function handleNew() {
    setSelectedNote(null)
    setIsNew(true)
    setEditorOpen(true)
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedNoteId(id)
    setTimeout(
      () => setCopiedNoteId((prev) => (prev === id ? null : prev)),
      2500
    )
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    clipboardTimer.current = setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {})
    }, 20000)
  }

  async function handleToggleFavorite(note: DecryptedNote) {
    if (!vaultKey) return
    const nextFavorite = !note.payload.favorite
    const updated: DecryptedNote = {
      ...note,
      payload: { ...note.payload, favorite: nextFavorite },
    }
    setNotesList((prev) => prev.map((n) => (n.id === note.id ? updated : n)))
    if (selectedNote?.id === note.id) setSelectedNote(updated)
    try {
      const encrypted = await encryptPayload(updated.payload, vaultKey)
      const result = await updateNoteAction({
        id: note.id,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: note.version,
      })
      if (result.error) throw new Error(result.error)
      broadcastMessage({ type: "CACHE_INVALIDATED" })
      loadData()
    } catch (err) {
      console.error("Failed to toggle favorite", err)
      loadData()
    }
  }

  function renderItem(item: DecryptedNote) {
    const common = {
      note: item,
      copiedId: copiedNoteId,
      onOpen: handleOpen,
      onCopy: handleCopy,
      onToggleFavorite: handleToggleFavorite,
    }
    return viewMode === "list" ? (
      <NoteRow key={item.id} {...common} />
    ) : (
      <NoteCard key={item.id} {...common} />
    )
  }

  const hasAny = notesList.length > 0

  return (
    <div className="max-w-300 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasAny ? (
              <>
                <span className="font-medium text-foreground">
                  {notesList.length}
                </span>{" "}
                notes ·{" "}
                <Star className="inline size-3.5 fill-amber-400 align-text-bottom text-amber-400" />
                <span className="font-medium text-foreground">
                  {" "}
                  {favoritesCount}
                </span>{" "}
                favorites
              </>
            ) : (
              "Encrypted markdown notes — private thoughts, snippets, instructions"
            )}
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus /> New Note
        </Button>
      </div>

      {hasAny && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                favoritesOnly
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Star className={cn("size-4", favoritesOnly && "fill-current")} />
              Favorites
            </button>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy((v || "name-asc") as SortBy)}
            >
              <SelectTrigger className="w-42.5">
                <SelectValue>{SORT_LABELS[sortBy]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Title (A–Z)</SelectItem>
                <SelectItem value="name-desc">Title (Z–A)</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-lg border bg-card p-0.5">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Decrypting notes in secure memory...
        </div>
      ) : !hasAny ? (
        <Card className="border-dashed py-16 text-center">
          <CardHeader className="items-center gap-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <StickyNote className="size-6" />
            </div>
            <CardTitle className="text-lg">No notes yet</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              Write your first encrypted note — Markdown supported with
              headings, lists, and code blocks.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : visibleNotes.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardHeader className="items-center gap-2">
            <Search className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">No matches found</CardTitle>
            <CardDescription>
              Try a different search term or clear the filters.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div
          className={
            viewMode === "list"
              ? "flex flex-col gap-2"
              : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {visibleNotes.map(renderItem)}
        </div>
      )}

      <NoteEditorDialog
        note={selectedNote}
        isNew={isNew}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={() => {
          broadcastMessage({ type: "CACHE_INVALIDATED" })
          loadData()
        }}
        onDeleted={() => {
          broadcastMessage({ type: "CACHE_INVALIDATED" })
          loadData()
        }}
      />
    </div>
  )
}

export default function NotesDashboardPage() {
  return (
    <VaultGuard>
      <NotesContent />
    </VaultGuard>
  )
}
