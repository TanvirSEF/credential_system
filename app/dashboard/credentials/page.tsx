"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload, encryptPayload } from "@/lib/crypto"
import {
  fetchCredentialsAction,
  updateCredentialAction,
} from "@/lib/actions/credentials"
import { fetchCredentialTypesAction } from "@/lib/actions/credential-types"
import {
  setCachedCredentials,
  getCachedCredentials,
} from "@/lib/storage/indexed-db"
import {
  subscribeBroadcast,
  broadcastMessage,
} from "@/lib/storage/broadcast-channel"
import { CreateCredentialDialog } from "@/components/credentials/create-credential-dialog"
import { CredentialDetailDialog } from "@/components/credentials/credential-detail-dialog"
import { CategoryTabs } from "@/components/credentials/category-tabs"
import { CredentialCard } from "@/components/credentials/credential-card"
import { CredentialRow } from "@/components/credentials/credential-row"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { resolveCategory } from "@/lib/credential-ui"
import { cn } from "@/lib/utils"
import type {
  DecryptedCredential,
  DecryptedCredentialPayload,
} from "@/lib/types/credential"
import type {
  DecryptedCredentialType,
  CredentialTypePayload,
} from "@/lib/types/credential-template"
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  KeyRound,
  Star,
} from "lucide-react"

type SortBy = "name-asc" | "name-desc" | "updated" | "created"

const SORT_LABELS: Record<SortBy, string> = {
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  updated: "Recently updated",
  created: "Recently added",
}

function compareCredentials(
  a: DecryptedCredential,
  b: DecryptedCredential,
  sortBy: SortBy
) {
  if (sortBy === "name-asc" || sortBy === "name-desc") {
    const fa = a.payload.favorite ? 1 : 0
    const fb = b.payload.favorite ? 1 : 0
    if (fa !== fb) return fb - fa
  }
  switch (sortBy) {
    case "name-asc":
      return a.payload.title.localeCompare(b.payload.title)
    case "name-desc":
      return b.payload.title.localeCompare(a.payload.title)
    case "updated":
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    case "created":
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    default:
      return 0
  }
}

function CredentialsContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [credentialsList, setCredentialsList] = useState<DecryptedCredential[]>(
    []
  )
  const [types, setTypes] = useState<DecryptedCredentialType[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortBy>("name-asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null)
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedCredential, setSelectedCredential] =
    useState<DecryptedCredential | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingCredential, setEditingCredential] =
    useState<DecryptedCredential | null>(null)

  const loadData = useCallback(async () => {
    if (!vaultId || !vaultKey) return

    const cachedRows = await getCachedCredentials(vaultId)
    if (cachedRows.length > 0) {
      const decryptedCached = await Promise.all(
        cachedRows.map(async (c) => ({
          id: c.id,
          vaultId: c.vaultId,
          ownerId: "",
          typeId: c.typeId,
          deletedAt: c.deletedAt,
          version: c.version,
          createdAt: new Date(),
          updatedAt: c.updatedAt,
          payload: await decryptPayload<DecryptedCredentialPayload>(
            {
              ciphertext: c.payloadCiphertext,
              iv: c.iv,
              cryptoVersion: c.cryptoVersion,
              schemaVersion: 1,
            },
            vaultKey
          ),
        }))
      )
      setCredentialsList(decryptedCached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const typesRes = await fetchCredentialTypesAction(vaultId)
    if (typesRes.types && typesRes.types.length > 0) {
      const decryptedTypes = await Promise.all(
        typesRes.types.map(async (t) => ({
          id: t.id,
          vaultId: t.vaultId,
          ownerId: t.ownerId,
          parentId: t.parentId,
          sortOrder: t.sortOrder,
          archivedAt: t.archivedAt,
          payload: await decryptPayload<CredentialTypePayload>(
            {
              ciphertext: t.payloadCiphertext,
              iv: t.iv,
              cryptoVersion: t.cryptoVersion,
              schemaVersion: t.schemaVersion,
            },
            vaultKey
          ),
        }))
      )
      setTypes(decryptedTypes)
    }

    const credsRes = await fetchCredentialsAction(vaultId)
    if (credsRes.credentials && credsRes.credentials.length > 0) {
      const decryptedCreds = await Promise.all(
        credsRes.credentials.map(async (c) => ({
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
      setCredentialsList(decryptedCreds)

      setCachedCredentials(
        vaultId,
        credsRes.credentials.map((r) => ({
          id: r.id,
          vaultId: r.vaultId,
          typeId: r.typeId,
          payloadCiphertext: r.payloadCiphertext,
          iv: r.iv,
          cryptoVersion: r.cryptoVersion,
          version: r.version,
          deletedAt: r.deletedAt,
          updatedAt: r.updatedAt,
        }))
      )
    } else {
      setCredentialsList([])
      setCachedCredentials(vaultId, [])
    }

    setLoading(false)
  }, [vaultId, vaultKey])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  useEffect(() => {
    return subscribeBroadcast((msg) => {
      if (msg.type === "CACHE_INVALIDATED") {
        loadData()
      }
    })
  }, [loadData])

  useEffect(() => {
    return () => {
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    }
  }, [])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of credentialsList) {
      if (item.typeId) map[item.typeId] = (map[item.typeId] ?? 0) + 1
    }
    return map
  }, [credentialsList])

  const favoritesCount = useMemo(
    () => credentialsList.filter((c) => c.payload.favorite).length,
    [credentialsList]
  )

  const visibleCredentials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = credentialsList.filter((item) => {
      if (query) {
        const haystack = [
          item.payload.title,
          item.payload.subtitle ?? "",
          ...(item.payload.websiteUrls ?? []),
          ...(item.payload.tags ?? []),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (activeFilter === "favorites") return !!item.payload.favorite
      if (activeFilter !== "all" && item.typeId !== activeFilter) return false
      return true
    })
    return filtered.slice().sort((a, b) => compareCredentials(a, b, sortBy))
  }, [credentialsList, searchQuery, activeFilter, sortBy])

  const isGrouped = activeFilter === "all" && !searchQuery.trim()

  const groupedSections = useMemo(() => {
    if (!isGrouped) return null
    const buckets = new Map<string, DecryptedCredential[]>()
    for (const item of visibleCredentials) {
      const key = item.typeId ?? "__none"
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(item)
    }
    const sections: Array<{
      key: string
      label: string
      icon?: string
      items: DecryptedCredential[]
    }> = []
    const sortedTypes = [...types].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const t of sortedTypes) {
      if (t.archivedAt) continue
      const items = buckets.get(t.id)
      if (items && items.length) {
        sections.push({
          key: t.id,
          label: t.payload.name,
          icon: t.payload.icon,
          items,
        })
      }
    }
    const none = buckets.get("__none")
    if (none && none.length) {
      sections.push({ key: "__none", label: "Uncategorized", items: none })
    }
    return sections
  }, [isGrouped, visibleCredentials, types])

  function handleOpen(credential: DecryptedCredential) {
    setSelectedCredential(credential)
    setDetailOpen(true)
  }

  function handleCopy(fieldId: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopiedFieldId(fieldId)
    setTimeout(
      () => setCopiedFieldId((prev) => (prev === fieldId ? null : prev)),
      2500
    )
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    clipboardTimer.current = setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {})
    }, 20000)
  }

  async function handleToggleFavorite(credential: DecryptedCredential) {
    if (!vaultKey) return
    const nextFavorite = !credential.payload.favorite
    const updated: DecryptedCredential = {
      ...credential,
      payload: { ...credential.payload, favorite: nextFavorite },
    }
    setCredentialsList((prev) =>
      prev.map((c) => (c.id === credential.id ? updated : c))
    )
    if (selectedCredential?.id === credential.id) setSelectedCredential(updated)
    try {
      const encrypted = await encryptPayload(updated.payload, vaultKey)
      const result = await updateCredentialAction({
        id: credential.id,
        typeId: credential.typeId || undefined,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: credential.version,
      })
      if (result.error) throw new Error(result.error)
      broadcastMessage({ type: "CACHE_INVALIDATED" })
      loadData()
    } catch (err) {
      console.error("Failed to toggle favorite", err)
      loadData()
    }
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function renderItem(item: DecryptedCredential) {
    const category = resolveCategory(item, types)
    const common = {
      credential: item,
      category,
      copiedFieldId,
      onOpen: handleOpen,
      onCopy: handleCopy,
      onToggleFavorite: handleToggleFavorite,
    }
    return viewMode === "list" ? (
      <CredentialRow key={item.id} {...common} />
    ) : (
      <CredentialCard key={item.id} {...common} />
    )
  }

  const hasAny = credentialsList.length > 0

  return (
    <div className="max-w-300 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Encrypted Credentials
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasAny ? (
              <>
                <span className="font-medium text-foreground">
                  {credentialsList.length}
                </span>{" "}
                credentials ·{" "}
                <Star className="inline size-3.5 fill-amber-400 align-text-bottom text-amber-400" />
                <span className="font-medium text-foreground">
                  {" "}
                  {favoritesCount}
                </span>{" "}
                favorites
              </>
            ) : (
              "Manage your passwords, API keys, and secrets"
            )}
          </p>
        </div>
        <CreateCredentialDialog
          existingTypes={types}
          editCredential={editingCredential}
          onSaved={() => {
            setEditingCredential(null)
            broadcastMessage({ type: "CACHE_INVALIDATED" })
            loadData()
          }}
        />
      </div>

      {hasAny && (
        <>
          <CategoryTabs
            types={types}
            counts={counts}
            favoritesCount={favoritesCount}
            totalCount={credentialsList.length}
            active={activeFilter}
            onChange={setActiveFilter}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by title, account, website, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy((v || "name-asc") as SortBy)}
              >
                <SelectTrigger className="w-42.5">
                  <SelectValue>{SORT_LABELS[sortBy]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="created">Recently added</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-lg border bg-card p-0.5">
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Decrypting credentials in secure memory...
        </div>
      ) : !hasAny ? (
        <Card className="border-dashed py-16 text-center">
          <CardHeader className="items-center gap-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-6" />
            </div>
            <CardTitle className="text-lg">No credentials yet</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              Store your first password, API key, or secret. Everything is
              encrypted on this device before it leaves.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : visibleCredentials.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardHeader className="items-center gap-2">
            <Search className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">No matches found</CardTitle>
            <CardDescription>
              Try a different search term or clear the active filters.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : groupedSections && groupedSections.length > 0 ? (
        <div className="space-y-6">
          {groupedSections.map((section) => {
            const collapsed = collapsedGroups.has(section.key)
            return (
              <section key={section.key} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(section.key)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <ChevronRight
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      !collapsed && "rotate-90"
                    )}
                  />
                  <h2 className="text-sm font-semibold tracking-tight">
                    {section.label}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {section.items.length}
                  </span>
                  <span className="ml-1 h-px flex-1 bg-border" />
                </button>
                {!collapsed && (
                  <div
                    className={
                      viewMode === "list"
                        ? "flex flex-col gap-2"
                        : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                    }
                  >
                    {section.items.map(renderItem)}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <div
          className={
            viewMode === "list"
              ? "flex flex-col gap-2"
              : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {visibleCredentials.map(renderItem)}
        </div>
      )}

      <CredentialDetailDialog
        credential={selectedCredential}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={() => {
          broadcastMessage({ type: "CACHE_INVALIDATED" })
          loadData()
        }}
        onEdit={(cred) => {
          setEditingCredential(cred)
        }}
      />
    </div>
  )
}

export default function CredentialsDashboardPage() {
  return (
    <VaultGuard>
      <CredentialsContent />
    </VaultGuard>
  )
}
