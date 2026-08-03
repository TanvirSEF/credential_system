import {
  Code,
  CreditCard,
  FileText,
  Folder,
  Key,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import type { CredentialField } from "@/lib/types/credential"
import type { DecryptedCredentialType } from "@/lib/types/credential-template"

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  key: Key,
  "file-text": FileText,
  code: Code,
  wifi: Wifi,
  "credit-card": CreditCard,
  folder: Folder,
}

export function resolveCategoryIcon(icon?: string | null): LucideIcon {
  if (icon && CATEGORY_ICON_MAP[icon]) return CATEGORY_ICON_MAP[icon]
  return Folder
}

export function knownCategoryIcon(icon?: string | null): string | null {
  if (icon && icon !== "folder" && CATEGORY_ICON_MAP[icon]) return icon
  return null
}

export const CATEGORY_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
  "from-sky-500 to-cyan-600",
  "from-indigo-500 to-violet-600",
  "from-teal-500 to-emerald-600",
  "from-orange-500 to-red-600",
]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function gradientForSeed(seed: string): string {
  return CATEGORY_GRADIENTS[hashSeed(seed) % CATEGORY_GRADIENTS.length]
}

export function initialLetter(title: string): string {
  const trimmed = title.trim()
  return trimmed ? trimmed[0].toUpperCase() : "?"
}

export function domainFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    return host || null
  } catch {
    return null
  }
}

export function relativeTime(date: Date): string {
  const then = new Date(date).getTime()
  const diff = Math.max(0, Date.now() - then)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week}w`
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function resolveCategory(
  credential: { typeId: string | null },
  types: DecryptedCredentialType[]
): DecryptedCredentialType | null {
  if (!credential.typeId) return null
  return types.find((t) => t.id === credential.typeId) ?? null
}

export function primaryCopyableField(
  fields: CredentialField[]
): CredentialField | null {
  return (
    fields.find((f) => f.secret && f.value) ??
    fields.find((f) => f.copyable && f.value) ??
    null
  )
}
