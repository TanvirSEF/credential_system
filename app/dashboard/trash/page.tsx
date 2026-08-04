"use client"

import { useEffect, useState, useCallback } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload } from "@/lib/crypto"
import {
  fetchTrashCredentialsAction,
  permanentDeleteCredentialAction,
  restoreCredentialAction,
} from "@/lib/actions/credentials"
import {
  fetchTrashProjectsAction,
  permanentDeleteProjectAction,
  restoreProjectAction,
} from "@/lib/actions/projects"
import {
  fetchTrashNotesAction,
  permanentDeleteNoteAction,
  restoreNoteAction,
} from "@/lib/actions/notes"
import {
  fetchTrashTasksAction,
  permanentDeleteTaskAction,
  restoreTaskAction,
} from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RefreshCw, Trash2 } from "lucide-react"
import { DecryptedCredentialPayload } from "@/lib/types/credential"
import { DecryptedProjectPayload } from "@/lib/types/project"
import { DecryptedNotePayload } from "@/lib/types/note"
import { DecryptedTaskPayload } from "@/lib/types/task"
import { countVariables } from "@/lib/env-parse"
import { noteSnippet } from "@/components/notes/markdown-preview"

type TrashType = "credentials" | "projects" | "notes" | "tasks"

interface TrashItem {
  id: string
  title: string
  subtitle?: string
  deletedAt: Date | null
}

const TRASH_TABS: Array<{ id: TrashType; label: string }> = [
  { id: "credentials", label: "Credentials" },
  { id: "projects", label: "Projects" },
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tasks" },
]

function TrashCard({
  item,
  onRestore,
  onPurge,
}: {
  item: TrashItem
  onRestore: (id: string) => void
  onPurge: (id: string) => void
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base font-bold">{item.title}</CardTitle>
          {item.subtitle && (
            <CardDescription className="truncate text-xs">
              {item.subtitle}
            </CardDescription>
          )}
        </div>
        <Badge variant="destructive" className="text-[10px]">
          Deleted
        </Badge>
      </CardHeader>
      <CardContent className="mt-3 flex items-center justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Deleted on:{" "}
          {item.deletedAt
            ? new Date(item.deletedAt).toLocaleDateString()
            : "Recent"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRestore(item.id)}
          >
            <RefreshCw className="mr-1.5 size-4" /> Restore
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onPurge(item.id)}
          >
            <Trash2 className="mr-1.5 size-4" /> Purge
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TrashDashboardContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [trashType, setTrashType] = useState<TrashType>("credentials")
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [purgeId, setPurgeId] = useState<string | null>(null)

  const loadTrash = useCallback(async () => {
    if (!vaultId || !vaultKey) return
    setLoading(true)

    let nextItems: TrashItem[] = []

    if (trashType === "credentials") {
      const res = await fetchTrashCredentialsAction(vaultId)
      nextItems = await Promise.all(
        (res.credentials ?? []).map(async (c) => {
          const payload = await decryptPayload<DecryptedCredentialPayload>(
            {
              ciphertext: c.payloadCiphertext,
              iv: c.iv,
              cryptoVersion: c.cryptoVersion,
              schemaVersion: c.schemaVersion,
            },
            vaultKey
          )
          return {
            id: c.id,
            title: payload.title,
            subtitle: payload.subtitle,
            deletedAt: c.deletedAt,
          }
        })
      )
    } else if (trashType === "projects") {
      const res = await fetchTrashProjectsAction(vaultId)
      nextItems = await Promise.all(
        (res.projects ?? []).map(async (p) => {
          const payload = await decryptPayload<DecryptedProjectPayload>(
            {
              ciphertext: p.payloadCiphertext,
              iv: p.iv,
              cryptoVersion: p.cryptoVersion,
              schemaVersion: p.schemaVersion,
            },
            vaultKey
          )
          return {
            id: p.id,
            title: payload.name,
            subtitle: `${payload.environments?.length ?? 0} envs · ${countVariables(payload.environments ?? [])} vars`,
            deletedAt: p.deletedAt,
          }
        })
      )
    } else if (trashType === "notes") {
      const res = await fetchTrashNotesAction(vaultId)
      nextItems = await Promise.all(
        (res.notes ?? []).map(async (n) => {
          const payload = await decryptPayload<DecryptedNotePayload>(
            {
              ciphertext: n.payloadCiphertext,
              iv: n.iv,
              cryptoVersion: n.cryptoVersion,
              schemaVersion: n.schemaVersion,
            },
            vaultKey
          )
          return {
            id: n.id,
            title: payload.title,
            subtitle: noteSnippet(payload.content) || undefined,
            deletedAt: n.deletedAt,
          }
        })
      )
    } else {
      const res = await fetchTrashTasksAction(vaultId)
      nextItems = await Promise.all(
        (res.tasks ?? []).map(async (t) => {
          const payload = await decryptPayload<DecryptedTaskPayload>(
            {
              ciphertext: t.payloadCiphertext,
              iv: t.iv,
              cryptoVersion: t.cryptoVersion,
              schemaVersion: t.schemaVersion,
            },
            vaultKey
          )
          return {
            id: t.id,
            title: payload.title,
            subtitle: payload.dueDate
              ? `Due ${new Date(payload.dueDate).toLocaleDateString()}`
              : undefined,
            deletedAt: t.deletedAt,
          }
        })
      )
    }

    setItems(nextItems)
    setLoading(false)
  }, [vaultId, vaultKey, trashType])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadTrash(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadTrash])

  async function handleRestore(id: string) {
    if (trashType === "credentials") {
      await restoreCredentialAction(id)
    } else if (trashType === "projects") {
      await restoreProjectAction(id)
    } else if (trashType === "notes") {
      await restoreNoteAction(id)
    } else {
      await restoreTaskAction(id)
    }
    loadTrash()
  }

  function handlePermanentDelete(id: string) {
    setPurgeId(id)
  }

  async function confirmPurge() {
    if (!purgeId) return
    if (trashType === "credentials") {
      await permanentDeleteCredentialAction(purgeId)
    } else if (trashType === "projects") {
      await permanentDeleteProjectAction(purgeId)
    } else if (trashType === "notes") {
      await permanentDeleteNoteAction(purgeId)
    } else {
      await permanentDeleteTaskAction(purgeId)
    }
    setPurgeId(null)
    loadTrash()
  }

  return (
    <div className="max-w-300 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Trash & Recovery
          </h1>
          <p className="text-sm text-muted-foreground">
            Soft-deleted items · {items.length} {trashType}
          </p>
        </div>

        <div className="flex items-center rounded-lg border bg-card p-0.5">
          {TRASH_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTrashType(t.id)}
              className={cn(
                "h-8 cursor-pointer rounded-md px-3 text-xs font-semibold transition-colors",
                trashType === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Decrypting trash entries...
        </div>
      ) : items.length === 0 ? (
        <Card className="py-12 text-center">
          <CardHeader>
            <CardTitle>Trash is Empty</CardTitle>
            <CardDescription>
              No deleted {trashType} found in your trash bin.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((item) => (
            <TrashCard
              key={item.id}
              item={item}
              onRestore={handleRestore}
              onPurge={handlePermanentDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={purgeId !== null}
        onOpenChange={(o) => {
          if (!o) setPurgeId(null)
        }}
        title="Permanently delete?"
        description="This item will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete forever"
        destructive
        onConfirm={confirmPurge}
      />
    </div>
  )
}

export default function TrashDashboardPage() {
  return (
    <VaultGuard>
      <TrashDashboardContent />
    </VaultGuard>
  )
}
