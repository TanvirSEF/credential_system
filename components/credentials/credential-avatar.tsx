"use client"

import { createElement } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  gradientForSeed,
  initialLetter,
  knownCategoryIcon,
  resolveCategoryIcon,
} from "@/lib/credential-ui"

export function CredentialAvatar({
  seed,
  label,
  categoryIcon,
  icon,
  className,
}: {
  seed: string
  label: string
  categoryIcon?: string | null
  icon?: LucideIcon
  className?: string
}) {
  const iconKey = knownCategoryIcon(categoryIcon)
  const resolvedIcon =
    icon ?? (iconKey ? resolveCategoryIcon(iconKey) : undefined)

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br font-bold text-white shadow-sm ring-1 ring-black/5",
        gradientForSeed(seed || label || "vault"),
        className
      )}
    >
      {resolvedIcon ? (
        createElement(resolvedIcon, { className: "size-5" })
      ) : (
        <span className="select-none">{initialLetter(label)}</span>
      )}
    </div>
  )
}
