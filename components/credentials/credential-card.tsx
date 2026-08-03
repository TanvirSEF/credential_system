"use client"

import { Check, Copy, ExternalLink, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CredentialAvatar } from "@/components/credentials/credential-avatar"
import { cn } from "@/lib/utils"
import {
  domainFromUrl,
  primaryCopyableField,
  relativeTime,
} from "@/lib/credential-ui"
import type { DecryptedCredential } from "@/lib/types/credential"
import type { DecryptedCredentialType } from "@/lib/types/credential-template"

export function CredentialCard({
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
  const domain = payload.websiteUrls?.[0]
    ? domainFromUrl(payload.websiteUrls[0])
    : null
  const isFavorite = !!payload.favorite
  const isCopied = copyField ? copiedFieldId === copyField.id : false

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen(credential)
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${payload.title}`}
      onClick={() => onOpen(credential)}
      onKeyDown={handleKeyDown}
      className="group relative cursor-pointer overflow-hidden p-4 transition-all outline-none hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="flex items-start gap-3">
        <CredentialAvatar
          seed={credential.id}
          label={payload.title}
          categoryIcon={category?.payload.icon ?? null}
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
                onToggleFavorite(credential)
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

          {payload.subtitle ? (
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {payload.subtitle}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/60 italic">
              {category?.payload.name ?? "No account set"}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {category && (
              <Badge variant="secondary">{category.payload.name}</Badge>
            )}
            {domain && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <ExternalLink className="size-3" />
                <span className="truncate">{domain}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-[11px] text-muted-foreground">
          Updated {relativeTime(credential.updatedAt)}
        </span>
        {copyField && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Copy primary field"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(copyField.id, copyField.value)
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
        )}
      </div>
    </Card>
  )
}
