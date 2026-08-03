"use client"

import { Star, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveCategoryIcon } from "@/lib/credential-ui"
import type { DecryptedCredentialType } from "@/lib/types/credential-template"

export function CategoryTabs({
  types,
  counts,
  favoritesCount,
  totalCount,
  active,
  onChange,
}: {
  types: DecryptedCredentialType[]
  counts: Record<string, number>
  favoritesCount: number
  totalCount: number
  active: string
  onChange: (id: string) => void
}) {
  const chips: Array<{
    id: string
    label: string
    count: number
    icon?: ReturnType<typeof resolveCategoryIcon>
  }> = [
    { id: "all", label: "All", count: totalCount, icon: LayoutGrid },
    { id: "favorites", label: "Favorites", count: favoritesCount, icon: Star },
    ...types
      .filter((t) => !t.archivedAt)
      .map((t) => ({
        id: t.id,
        label: t.payload.name,
        count: counts[t.id] ?? 0,
        icon: resolveCategoryIcon(t.payload.icon),
      })),
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isActive = active === chip.id
        const Icon = chip.icon
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              "group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "size-3.5",
                  chip.id === "favorites" && isActive && "fill-current"
                )}
              />
            )}
            <span className="truncate">{chip.label}</span>
            <span
              className={cn(
                "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-background"
              )}
            >
              {chip.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
