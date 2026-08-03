import { cn } from "@/lib/utils"

function initialsFrom(name?: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

export function Avatar({
  avatarUrl,
  name,
  className,
}: {
  avatarUrl?: string | null
  name?: string | null
  className?: string
}) {
  const alt = name ? `${name}'s avatar` : "User avatar"
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 font-bold text-white ring-1 ring-white/10",
        className
      )}
      aria-label={alt}
    >
      {avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span>{initialsFrom(name)}</span>
      )}
    </div>
  )
}
