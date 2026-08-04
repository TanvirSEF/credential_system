"use client"

import { useEffect, useState, useCallback } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload } from "@/lib/crypto"
import {
  archiveCredentialTypeAction,
  fetchCredentialTypesAction,
} from "@/lib/actions/credential-types"
import {
  enqueueSyncJob,
  getCachedTypes,
  setCachedTypes,
} from "@/lib/storage/indexed-db"
import { flushSyncQueue } from "@/lib/sync-engine"
import { CreateTypeDialog } from "@/components/create-type-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Folder, Lock } from "lucide-react"
import {
  DecryptedCredentialType,
  CredentialTypePayload,
} from "@/lib/types/credential-template"

function TypesDashboardContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [types, setTypes] = useState<DecryptedCredentialType[]>([])
  const [loading, setLoading] = useState(true)

  const loadTypes = useCallback(async () => {
    if (!vaultId || !vaultKey) return
    setLoading(true)

    const decryptRows = async (
      rows: Array<{
        id: string
        vaultId: string
        ownerId?: string
        parentId: string | null
        sortOrder: number
        archivedAt: Date | null
        payloadCiphertext: string
        iv: string
        cryptoVersion: number
        schemaVersion?: number
      }>
    ) =>
      Promise.all(
        rows.map(async (row) => {
          const payload = await decryptPayload<CredentialTypePayload>(
            {
              ciphertext: row.payloadCiphertext,
              iv: row.iv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: row.schemaVersion ?? 1,
            },
            vaultKey
          )

          return {
            id: row.id,
            vaultId: row.vaultId,
            ownerId: row.ownerId ?? "",
            parentId: row.parentId,
            sortOrder: row.sortOrder,
            archivedAt: row.archivedAt,
            payload,
          }
        })
      )

    const cachedRows = await getCachedTypes(vaultId)
    if (cachedRows.length > 0) {
      setTypes(await decryptRows(cachedRows))
      setLoading(false)
    }

    if (!navigator.onLine) {
      setLoading(false)
      return
    }

    try {
      const res = await fetchCredentialTypesAction(vaultId)
      if (res.types && res.types.length > 0) {
        const decryptedList = await decryptRows(res.types)

        setTypes(decryptedList)
        await setCachedTypes(
          vaultId,
          res.types.map((row) => ({
            id: row.id,
            vaultId: row.vaultId,
            parentId: row.parentId,
            payloadCiphertext: row.payloadCiphertext,
            iv: row.iv,
            cryptoVersion: row.cryptoVersion,
            sortOrder: row.sortOrder,
            archivedAt: row.archivedAt,
          }))
        )
      } else {
        setTypes([])
        await setCachedTypes(vaultId, [])
      }
    } catch (error) {
      console.warn("Using cached credential types while offline:", error)
    } finally {
      setLoading(false)
    }
  }, [vaultId, vaultKey])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadTypes(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadTypes])

  async function handleArchive(id: string) {
    if (!vaultId) return
    if (!confirm("Are you sure you want to archive this category?")) return

    const isOnline = navigator.onLine
    if (isOnline) {
      await archiveCredentialTypeAction(id)
    } else {
      await enqueueSyncJob("ARCHIVE_TYPE", { id })

      const existing = await getCachedTypes(vaultId)
      await setCachedTypes(
        vaultId,
        existing.map((t) =>
          t.id === id ? { ...t, archivedAt: new Date() } : t
        )
      )
      flushSyncQueue()
    }

    loadTypes()
  }

  return (
    <div className="max-w-[1200px] space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Categories & Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Hierarchical credential categories · {types.length} categories
          </p>
        </div>
        <CreateTypeDialog existingTypes={types} onTypeCreated={loadTypes} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Decrypting category templates...
        </div>
      ) : types.length === 0 ? (
        <Card className="border-dashed py-16 text-center shadow-sm">
          <CardHeader className="items-center gap-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Folder className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl">No Categories Found</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              Create your first custom credential category template to organize
              your data.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {types.map((type) => (
            <Card
              key={type.id}
              className="group relative overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                      <Folder className="h-4 w-4" />
                    </div>
                    <span>{type.payload.name}</span>
                  </CardTitle>
                  {type.parentId && (
                    <Badge variant="secondary" className="text-[10px]">
                      Nested Sub-category
                    </Badge>
                  )}
                  {type.payload.description && (
                    <CardDescription>
                      {type.payload.description}
                    </CardDescription>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(type.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Archive
                </Button>
              </CardHeader>

              <CardContent className="space-y-3 pt-2">
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Template Fields ({type.payload.fields?.length || 0})
                </div>

                {type.payload.fields && type.payload.fields.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {type.payload.fields.map((f) => (
                      <Badge
                        key={f.id}
                        variant="secondary"
                        className="flex items-center gap-1 bg-secondary/50 text-xs font-normal transition-colors hover:bg-secondary/70"
                      >
                        {f.secret && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{f.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({f.type})
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Standard fields
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TypesDashboardPage() {
  return (
    <VaultGuard>
      <TypesDashboardContent />
    </VaultGuard>
  )
}
