"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { softDeleteCredentialAction } from "@/lib/actions/credentials"
import { DecryptedCredential } from "@/lib/types/credential"
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Star,
  Trash2,
} from "lucide-react"

function isSafeHref(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function CredentialDetailDialog({
  credential,
  open,
  onOpenChange,
  onDeleted,
  onEdit,
}: {
  credential: DecryptedCredential | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
  onEdit: (credential: DecryptedCredential) => void
}) {
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>(
    {}
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const clearClipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (clearClipboardTimer.current) clearTimeout(clearClipboardTimer.current)
    }
  }, [])

  if (!credential) return null

  function toggleReveal(id: string) {
    setRevealedFields((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function handleCopy(id: string, textToCopy: string) {
    navigator.clipboard.writeText(textToCopy)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)

    if (clearClipboardTimer.current) clearTimeout(clearClipboardTimer.current)
    clearClipboardTimer.current = setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {})
    }, 20000)
  }

  async function handleDelete() {
    if (!credential) return
    if (!confirm("Move this credential to Trash?")) return
    await softDeleteCredentialAction(credential.id)
    onOpenChange(false)
    onDeleted()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {credential.payload.title}
            </DialogTitle>
            {credential.payload.favorite && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{" "}
                Favorite
              </Badge>
            )}
          </div>
          {credential.payload.subtitle && (
            <DialogDescription>{credential.payload.subtitle}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {credential.payload.websiteUrls &&
            credential.payload.websiteUrls.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Website
                </span>
                <div>
                  {isSafeHref(credential.payload.websiteUrls[0]) ? (
                    <a
                      href={credential.payload.websiteUrls[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium break-all text-primary hover:underline"
                    >
                      {credential.payload.websiteUrls[0]}{" "}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium break-all text-muted-foreground">
                      {credential.payload.websiteUrls[0]}
                    </span>
                  )}
                </div>
              </div>
            )}

          {credential.payload.fields &&
            credential.payload.fields.length > 0 && (
              <div className="space-y-3 border-t pt-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Fields
                </span>
                <div className="space-y-2">
                  {credential.payload.fields.map((f) => {
                    const isRevealed = revealedFields[f.id]
                    const displayValue =
                      f.secret && !isRevealed ? "••••••••••••" : f.value

                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-xs font-medium text-muted-foreground">
                            {f.label}
                          </div>
                          <div className="truncate font-mono text-sm font-semibold">
                            {displayValue}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {f.secret && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReveal(f.id)}
                              className="h-7 px-2 text-xs"
                            >
                              {isRevealed ? (
                                <EyeOff className="mr-1 h-3.5 w-3.5" />
                              ) : (
                                <Eye className="mr-1 h-3.5 w-3.5" />
                              )}
                              {isRevealed ? "Hide" : "Reveal"}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCopy(f.id, f.value)}
                            className="h-7 px-2 text-xs"
                          >
                            {copiedId === f.id ? (
                              <>
                                <Check className="mr-1 h-3.5 w-3.5 text-green-500" />{" "}
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          {credential.payload.notes && (
            <div className="space-y-1 border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Notes
              </span>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {credential.payload.notes}
              </div>
            </div>
          )}

          {credential.payload.tags && credential.payload.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t pt-3">
              {credential.payload.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Move to Trash
          </Button>

          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onEdit(credential)
            }}
          >
            Edit Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
