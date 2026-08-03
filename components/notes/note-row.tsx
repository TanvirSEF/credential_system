"use client"

import { Check, Copy, Star, StickyNote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CredentialAvatar } from "@/components/credentials/credential-avatar"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/credential-ui"
import { noteSnippet } from "@/components/notes/markdown-preview"
import type { DecryptedNote } from "@/lib/types/note"

export function NoteRow({
  note,
  copiedId,
  onOpen,
  onCopy,
  onToggleFavorite,
}: {
  note: DecryptedNote
  copiedId: string | null
  onOpen: (note: DecryptedNote) => void
  onCopy: (id: string, text: string) => void
  onToggleFavorite: (note: DecryptedNote) => void
}) {
  const { payload } = note
  const isFavorite = !!payload.favorite
  const snippet = noteSnippet(payload.content)
  const isCopied = copiedId === note.id

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen(note)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${payload.title}`}
      onClick={() => onOpen(note)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors outline-none hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <CredentialAvatar
        seed={note.id}
        label={payload.title}
        icon={StickyNote}
        className="size-9 text-sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {payload.title}
          </span>
          {snippet && (
            <span className="truncate text-xs text-muted-foreground">
              · {snippet}
            </span>
          )}
        </div>
      </div>

      {payload.tags && payload.tags.length > 0 && (
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {payload.tags.length} tags
        </Badge>
      )}

      <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground md:block">
        {relativeTime(note.updatedAt)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Copy markdown"
        onClick={(e) => {
          e.stopPropagation()
          onCopy(note.id, payload.content)
        }}
        className={cn(
          "shrink-0 text-muted-foreground hover:text-foreground",
          isCopied && "text-emerald-600 hover:text-emerald-600"
        )}
      >
        {isCopied ? <Check /> : <Copy />}
      </Button>

      <button
        type="button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(note)
        }}
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
      >
        <Star
          className={cn(
            "size-4",
            isFavorite && "fill-amber-400 text-amber-400"
          )}
        />
      </button>
    </div>
  )
}
