"use client"

import { Check, Copy, FolderGit2, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CredentialAvatar } from "@/components/credentials/credential-avatar"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/credential-ui"
import { countVariables, serializeEnv } from "@/lib/env-parse"
import type { DecryptedProject } from "@/lib/types/project"

export function ProjectRow({
  project,
  copiedId,
  onOpen,
  onCopyEnv,
  onToggleFavorite,
}: {
  project: DecryptedProject
  copiedId: string | null
  onOpen: (project: DecryptedProject) => void
  onCopyEnv: (id: string, text: string) => void
  onToggleFavorite: (project: DecryptedProject) => void
}) {
  const { payload } = project
  const isFavorite = !!payload.favorite
  const varCount = countVariables(payload.environments ?? [])
  const firstEnv = payload.environments?.[0]
  const isCopied = copiedId === project.id

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen(project)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${payload.name}`}
      onClick={() => onOpen(project)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors outline-none hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <CredentialAvatar
        seed={project.id}
        label={payload.name}
        icon={FolderGit2}
        className="size-9 text-sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{payload.name}</span>
          {payload.description && (
            <span className="truncate text-xs text-muted-foreground">
              · {payload.description}
            </span>
          )}
        </div>
      </div>

      <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
        {varCount} vars
      </Badge>

      <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground md:block">
        {relativeTime(project.updatedAt)}
      </span>

      {firstEnv && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy env"
          onClick={(e) => {
            e.stopPropagation()
            onCopyEnv(project.id, serializeEnv(firstEnv))
          }}
          className={cn(
            "shrink-0 text-muted-foreground hover:text-foreground",
            isCopied && "text-emerald-600 hover:text-emerald-600"
          )}
        >
          {isCopied ? <Check /> : <Copy />}
        </Button>
      )}

      <button
        type="button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(project)
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
