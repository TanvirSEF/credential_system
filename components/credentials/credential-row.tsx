"use client"

import { Check, Copy, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CredentialAvatar } from "@/components/credentials/credential-avatar"
import { cn } from "@/lib/utils"
import { primaryCopyableField, relativeTime } from "@/lib/credential-ui"
import type { DecryptedCredential } from "@/lib/types/credential"
import type { DecryptedCredentialType } from "@/lib/types/credential-template"

export function CredentialRow({
  credential,
  category,
  copiedFieldId,
  onOpen,
  onCopy,
  onToggleFavorite,
}: {
  credential: DecryptedCredential
  category: DecryptedCredentialType | null
  copiedFieldId: string | null
  onOpen: (credential: DecryptedCredential) => void
  onCopy: (fieldId: string, value: string) => void
  onToggleFavorite: (credential: DecryptedCredential) => void
}) {
  const { payload } = credential
  const copyField = primaryCopyableField(payload.fields ?? [])
  const isFavorite = !!payload.favorite
  const isCopied = copyField ? copiedFieldId === copyField.id : false

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen(credential)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${payload.title}`}
      onClick={() => onOpen(credential)}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors outline-none hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <CredentialAvatar
        seed={credential.id}
        label={payload.title}
        categoryIcon={category?.payload.icon ?? null}
        className="size-9 text-sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {payload.title}
          </span>
          {payload.subtitle && (
            <span className="truncate font-mono text-xs text-muted-foreground">
              · {payload.subtitle}
            </span>
          )}
        </div>
      </div>

      {category && (
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {category.payload.name}
        </Badge>
      )}

      <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground md:block">
        {relativeTime(credential.updatedAt)}
      </span>

      {copyField && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy primary field"
          onClick={(e) => {
            e.stopPropagation()
            onCopy(copyField.id, copyField.value)
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
          onToggleFavorite(credential)
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
