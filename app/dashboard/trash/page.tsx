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
import {
  DecryptedCredential,
  DecryptedCredentialPayload,
} from "@/lib/types/credential"
import { DecryptedProject, DecryptedProjectPayload } from "@/lib/types/project"
import { countVariables } from "@/lib/env-parse"

type TrashType = "credentials" | "projects"

function TrashDashboardContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [trashType, setTrashType] = useState<TrashType>("credentials")
  const [credList, setCredList] = useState<DecryptedCredential[]>([])
  const [projList, setProjList] = useState<DecryptedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [purgeId, setPurgeId] = useState<string | null>(null)

  const loadTrash = useCallback(async () => {
    if (!vaultId || !vaultKey) return
    setLoading(true)

    if (trashType === "credentials") {
      const res = await fetchTrashCredentialsAction(vaultId)
      if (res.credentials && res.credentials.length > 0) {
        const decrypted = await Promise.all(
          res.credentials.map(async (c) => ({
            id: c.id,
            vaultId: c.vaultId,
            ownerId: c.ownerId,
            typeId: c.typeId,
            deletedAt: c.deletedAt,
            version: c.version,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            payload: await decryptPayload<DecryptedCredentialPayload>(
              {
                ciphertext: c.payloadCiphertext,
                iv: c.iv,
                cryptoVersion: c.cryptoVersion,
                schemaVersion: c.schemaVersion,
              },
              vaultKey
            ),
          }))
        )
        setCredList(decrypted)
      } else {
        setCredList([])
      }
    } else {
      const res = await fetchTrashProjectsAction(vaultId)
      if (res.projects && res.projects.length > 0) {
        const decrypted = await Promise.all(
          res.projects.map(async (p) => ({
            id: p.id,
            vaultId: p.vaultId,
            ownerId: p.ownerId,
            deletedAt: p.deletedAt,
            version: p.version,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            payload: await decryptPayload<DecryptedProjectPayload>(
              {
                ciphertext: p.payloadCiphertext,
                iv: p.iv,
                cryptoVersion: p.cryptoVersion,
                schemaVersion: p.schemaVersion,
              },
              vaultKey
            ),
          }))
        )
        setProjList(decrypted)
      } else {
        setProjList([])
      }
    }

    setLoading(false)
  }, [vaultId, vaultKey, trashType])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  async function handleRestore(id: string) {
    if (trashType === "credentials") {
      await restoreCredentialAction(id)
    } else {
      await restoreProjectAction(id)
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
    } else {
      await permanentDeleteProjectAction(purgeId)
    }
    setPurgeId(null)
    loadTrash()
  }

  const activeCount =
    trashType === "credentials" ? credList.length : projList.length

  return (
    <div className="max-w-300 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Trash & Recovery
          </h1>
          <p className="text-sm text-muted-foreground">
            Soft-deleted items · {activeCount} {trashType}
          </p>
        </div>

        <div className="flex items-center rounded-lg border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setTrashType("credentials")}
            className={cn(
              "h-8 cursor-pointer rounded-md px-3 text-xs font-semibold transition-colors",
              trashType === "credentials"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Credentials
          </button>
          <button
            type="button"
            onClick={() => setTrashType("projects")}
            className={cn(
              "h-8 cursor-pointer rounded-md px-3 text-xs font-semibold transition-colors",
              trashType === "projects"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Projects
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Decrypting trash entries...
        </div>
      ) : activeCount === 0 ? (
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
          {trashType === "credentials"
            ? credList.map((item) => (
                <Card key={item.id} className="shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base font-bold">
                        {item.payload.title}
                      </CardTitle>
                      {item.payload.subtitle && (
                        <CardDescription className="font-mono text-xs">
                          {item.payload.subtitle}
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
                        onClick={() => handleRestore(item.id)}
                      >
                        <RefreshCw className="mr-1.5 size-4" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePermanentDelete(item.id)}
                      >
                        <Trash2 className="mr-1.5 size-4" /> Purge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            : projList.map((item) => (
                <Card key={item.id} className="shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base font-bold">
                        {item.payload.name}
                      </CardTitle>
                      {item.payload.description && (
                        <CardDescription className="text-xs">
                          {item.payload.description}
                        </CardDescription>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.payload.environments?.length ?? 0} environments ·{" "}
                        {countVariables(item.payload.environments ?? [])} vars
                      </p>
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
                        onClick={() => handleRestore(item.id)}
                      >
                        <RefreshCw className="mr-1.5 size-4" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePermanentDelete(item.id)}
                      >
                        <Trash2 className="mr-1.5 size-4" /> Purge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
