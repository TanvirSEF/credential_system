"use client"

import { Check, Copy, FolderGit2, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CredentialAvatar } from "@/components/credentials/credential-avatar"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/credential-ui"
import { countVariables, serializeEnv } from "@/lib/env-parse"
import type { DecryptedProject } from "@/lib/types/project"

export function ProjectCard({
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
  const envCount = payload.environments?.length ?? 0
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
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${payload.name}`}
      onClick={() => onOpen(project)}
      onKeyDown={handleKeyDown}
      className="group relative cursor-pointer overflow-hidden p-4 transition-all outline-none hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="flex items-start gap-3">
        <CredentialAvatar
          seed={project.id}
          label={payload.name}
          icon={FolderGit2}
          className="size-11 text-base"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm leading-tight font-bold">
              {payload.name}
            </h3>
            <button
              type="button"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(project)
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

          {payload.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {payload.description}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/60 italic">
              No description
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              {envCount} {envCount === 1 ? "env" : "envs"}
            </Badge>
            <Badge variant="outline">{varCount} vars</Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-[11px] text-muted-foreground">
          Updated {relativeTime(project.updatedAt)}
        </span>
        {firstEnv && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label={`Copy ${firstEnv.name} env`}
            onClick={(e) => {
              e.stopPropagation()
              onCopyEnv(project.id, serializeEnv(firstEnv))
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
                <Copy /> .env
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
