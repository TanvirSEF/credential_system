"use client"

import { Check, Copy, Star, StickyNote } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CredentialAvatar } from "@/components/credentials/credential-avatar"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/credential-ui"
import { noteSnippet } from "@/components/notes/markdown-preview"
import type { DecryptedNote } from "@/lib/types/note"

export function NoteCard({
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
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${payload.title}`}
      onClick={() => onOpen(note)}
      onKeyDown={handleKeyDown}
      className="group relative cursor-pointer overflow-hidden p-4 transition-all outline-none hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="flex items-start gap-3">
        <CredentialAvatar
          seed={note.id}
          label={payload.title}
          icon={StickyNote}
          className="size-11 text-base"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm leading-tight font-bold">
              {payload.title}
            </h3>
            <button
              type="button"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(note)
              }}
              className="-mt-0.5 -mr-1 shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <Star
                className={cn(
                  "size-4",
                  isFavorite && "fill-amber-400 text-amber-400"
                )}
              />
            </button>
          </div>

          {snippet ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {snippet}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/60 italic">
              Empty note
            </p>
          )}

          {payload.tags && payload.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {payload.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-[11px] text-muted-foreground">
          Updated {relativeTime(note.updatedAt)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Copy markdown"
          onClick={(e) => {
            e.stopPropagation()
            onCopy(note.id, payload.content)
          }}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            isCopied && "text-emerald-600 hover:text-emerald-600"
          )}
        >
          {isCopied ? (
            <>
              <Check /> Copied
            </>
          ) : (
            <>
              <Copy /> Copy
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
