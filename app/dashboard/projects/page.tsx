"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload, encryptPayload } from "@/lib/crypto"
import {
  fetchProjectsAction,
  updateProjectAction,
} from "@/lib/actions/projects"
import { setCachedProjects, getCachedProjects } from "@/lib/storage/indexed-db"
import {
  subscribeBroadcast,
  broadcastMessage,
} from "@/lib/storage/broadcast-channel"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectDetailDialog } from "@/components/projects/project-detail-dialog"
import { ProjectCard } from "@/components/projects/project-card"
import { ProjectRow } from "@/components/projects/project-row"
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
import { cn } from "@/lib/utils"
import type {
  DecryptedProject,
  DecryptedProjectPayload,
} from "@/lib/types/project"
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  FolderGit2,
  Star,
} from "lucide-react"

type SortBy = "name-asc" | "name-desc" | "updated"

const SORT_LABELS: Record<SortBy, string> = {
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  updated: "Recently updated",
}

function compareProjects(
  a: DecryptedProject,
  b: DecryptedProject,
  sortBy: SortBy
) {
  if (sortBy === "name-asc" || sortBy === "name-desc") {
    const fa = a.payload.favorite ? 1 : 0
    const fb = b.payload.favorite ? 1 : 0
    if (fa !== fb) return fb - fa
  }
  switch (sortBy) {
    case "name-asc":
      return a.payload.name.localeCompare(b.payload.name)
    case "name-desc":
      return b.payload.name.localeCompare(a.payload.name)
    case "updated":
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    default:
      return 0
  }
}

function ProjectsContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [projectsList, setProjectsList] = useState<DecryptedProject[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("name-asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [copiedEnvId, setCopiedEnvId] = useState<string | null>(null)
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedProject, setSelectedProject] =
    useState<DecryptedProject | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<DecryptedProject | null>(
    null
  )

  const loadData = useCallback(async () => {
    if (!vaultId || !vaultKey) return

    const cachedRows = await getCachedProjects(vaultId)
    if (cachedRows.length > 0) {
      const decryptedCached = await Promise.all(
        cachedRows.map(async (c) => ({
          id: c.id,
          vaultId: c.vaultId,
          ownerId: "",
          deletedAt: c.deletedAt,
          version: c.version,
          createdAt: new Date(),
          updatedAt: c.updatedAt,
          payload: await decryptPayload<DecryptedProjectPayload>(
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
      setProjectsList(decryptedCached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const res = await fetchProjectsAction(vaultId)
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
      setProjectsList(decrypted)

      setCachedProjects(
        vaultId,
        res.projects.map((p) => ({
          id: p.id,
          vaultId: p.vaultId,
          payloadCiphertext: p.payloadCiphertext,
          iv: p.iv,
          cryptoVersion: p.cryptoVersion,
          version: p.version,
          deletedAt: p.deletedAt,
          updatedAt: p.updatedAt,
        }))
      )
    } else {
      setProjectsList([])
      setCachedProjects(vaultId, [])
    }

    setLoading(false)
  }, [vaultId, vaultKey])

  useEffect(() => {
    loadData()
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

  const favoritesCount = useMemo(
    () => projectsList.filter((p) => p.payload.favorite).length,
    [projectsList]
  )

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = projectsList.filter((item) => {
      if (favoritesOnly && !item.payload.favorite) return false
      if (query) {
        const haystack = [
          item.payload.name,
          item.payload.description ?? "",
          ...(item.payload.tags ?? []),
          ...(item.payload.environments ?? []).flatMap((e) =>
            e.variables.map((v) => v.key)
          ),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
    return filtered.slice().sort((a, b) => compareProjects(a, b, sortBy))
  }, [projectsList, searchQuery, favoritesOnly, sortBy])

  function handleOpen(project: DecryptedProject) {
    setSelectedProject(project)
    setDetailOpen(true)
  }

  function handleCopyEnv(id: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedEnvId(id)
    setTimeout(
      () => setCopiedEnvId((prev) => (prev === id ? null : prev)),
      2500
    )
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current)
    clipboardTimer.current = setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {})
    }, 20000)
  }

  async function handleToggleFavorite(project: DecryptedProject) {
    if (!vaultKey) return
    const nextFavorite = !project.payload.favorite
    const updated: DecryptedProject = {
      ...project,
      payload: { ...project.payload, favorite: nextFavorite },
    }
    setProjectsList((prev) =>
      prev.map((p) => (p.id === project.id ? updated : p))
    )
    if (selectedProject?.id === project.id) setSelectedProject(updated)
    try {
      const encrypted = await encryptPayload(updated.payload, vaultKey)
      const result = await updateProjectAction({
        id: project.id,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: project.version,
      })
      if (result.error) throw new Error(result.error)
      broadcastMessage({ type: "CACHE_INVALIDATED" })
      loadData()
    } catch (err) {
      console.error("Failed to toggle favorite", err)
      loadData()
    }
  }

  function renderItem(item: DecryptedProject) {
    const common = {
      project: item,
      copiedId: copiedEnvId,
      onOpen: handleOpen,
      onCopyEnv: handleCopyEnv,
      onToggleFavorite: handleToggleFavorite,
    }
    return viewMode === "list" ? (
      <ProjectRow key={item.id} {...common} />
    ) : (
      <ProjectCard key={item.id} {...common} />
    )
  }

  const hasAny = projectsList.length > 0

  return (
    <div className="max-w-300 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasAny ? (
              <>
                <span className="font-medium text-foreground">
                  {projectsList.length}
                </span>{" "}
                projects ·{" "}
                <Star className="inline size-3.5 fill-amber-400 align-text-bottom text-amber-400" />
                <span className="font-medium text-foreground">
                  {" "}
                  {favoritesCount}
                </span>{" "}
                favorites
              </>
            ) : (
              "Encrypted .env & secrets manager for your apps"
            )}
          </p>
        </div>
        <CreateProjectDialog
          editProject={editingProject}
          onSaved={() => {
            setEditingProject(null)
            broadcastMessage({ type: "CACHE_INVALIDATED" })
            loadData()
          }}
        />
      </div>

      {hasAny && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, descriptions, tags, or var keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                favoritesOnly
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Star className={cn("size-4", favoritesOnly && "fill-current")} />
              Favorites
            </button>

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
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Decrypting projects in secure memory...
        </div>
      ) : !hasAny ? (
        <Card className="border-dashed py-16 text-center">
          <CardHeader className="items-center gap-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FolderGit2 className="size-6" />
            </div>
            <CardTitle className="text-lg">No projects yet</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              Create a project to manage its environment variables and secrets
              across production, staging, and development.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : visibleProjects.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardHeader className="items-center gap-2">
            <Search className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">No matches found</CardTitle>
            <CardDescription>
              Try a different search term or clear the filters.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div
          className={
            viewMode === "list"
              ? "flex flex-col gap-2"
              : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {visibleProjects.map(renderItem)}
        </div>
      )}

      <ProjectDetailDialog
        project={selectedProject}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={() => {
          broadcastMessage({ type: "CACHE_INVALIDATED" })
          loadData()
        }}
        onSaved={(updated) => {
          setProjectsList((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          )
          setSelectedProject(updated)
          broadcastMessage({ type: "CACHE_INVALIDATED" })
          loadData()
        }}
        onEdit={(project) => {
          setEditingProject(project)
        }}
      />
    </div>
  )
}

export default function ProjectsDashboardPage() {
  return (
    <VaultGuard>
      <ProjectsContent />
    </VaultGuard>
  )
}
