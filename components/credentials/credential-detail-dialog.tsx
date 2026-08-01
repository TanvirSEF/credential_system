"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { softDeleteCredentialAction } from "@/lib/actions/credentials";
import { DecryptedCredential } from "@/lib/types/credential";

export function CredentialDetailDialog({
  credential,
  open,
  onOpenChange,
  onDeleted,
  onEdit,
}: {
  credential: DecryptedCredential | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onEdit: (credential: DecryptedCredential) => void;
}) {
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!credential) return null;

  function toggleReveal(id: string) {
    setRevealedFields((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleCopy(id: string, textToCopy: string) {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  async function handleDelete() {
    if (!credential) return;
    if (!confirm("Move this credential to Trash?")) return;
    await softDeleteCredentialAction(credential.id);
    onOpenChange(false);
    onDeleted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{credential.payload.title}</DialogTitle>
            {credential.payload.favorite && <Badge variant="secondary">⭐ Favorite</Badge>}
          </div>
          {credential.payload.subtitle && (
            <DialogDescription>{credential.payload.subtitle}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Website URL */}
          {credential.payload.websiteUrls && credential.payload.websiteUrls.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Website</span>
              <div>
                <a
                  href={credential.payload.websiteUrls[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline break-all"
                >
                  {credential.payload.websiteUrls[0]} ↗
                </a>
              </div>
            </div>
          )}

          {/* Credential Fields */}
          {credential.payload.fields && credential.payload.fields.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Fields</span>
              <div className="space-y-2">
                {credential.payload.fields.map((f) => {
                  const isRevealed = revealedFields[f.id];
                  const displayValue = f.secret && !isRevealed ? "••••••••••••" : f.value;

                  return (
                    <div key={f.id} className="rounded-lg border p-3 bg-muted/30 flex items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground font-medium">{f.label}</div>
                        <div className="text-sm font-mono font-semibold truncate">{displayValue}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        {f.secret && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReveal(f.id)}
                            className="text-xs h-7 px-2"
                          >
                            {isRevealed ? "👁️ Hide" : "👁️ Reveal"}
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopy(f.id, f.value)}
                          className="text-xs h-7 px-2"
                        >
                          {copiedId === f.id ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {credential.payload.notes && (
            <div className="space-y-1 border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Notes</span>
              <div className="rounded-lg border p-3 bg-muted/20 text-sm whitespace-pre-wrap leading-relaxed">
                {credential.payload.notes}
              </div>
            </div>
          )}

          {/* Tags */}
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
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            Move to Trash
          </Button>

          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onEdit(credential);
            }}
          >
            Edit Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
