"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FileText,
  Folder,
  FolderGit2,
  Key,
  LayoutDashboard,
  Lock,
  LogOut,
  MoreHorizontal,
  Settings,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import { signOutAction } from "@/lib/actions/auth"
import { useVaultSessionStore } from "@/stores/vault-session-store"

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/credentials", label: "Credentials", icon: Key },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/types", label: "Categories", icon: Folder },
  { href: "/dashboard/trash", label: "Trash Bin", icon: Trash2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const primaryNavigation = navigation.slice(0, 5)

function routeIsActive(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  )
}

export function DashboardMobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const lockVault = useVaultSessionStore((state) => state.lockVault)
  const [moreOpen, setMoreOpen] = useState(false)
  const activeItem = navigation.find((item) =>
    routeIsActive(pathname, item.href)
  )
  const secondaryRouteActive = navigation
    .slice(4)
    .some((item) => routeIsActive(pathname, item.href))

  function handleLock() {
    setMoreOpen(false)
    lockVault()
    router.push("/unlock")
  }

  async function handleSignOut() {
    setMoreOpen(false)
    lockVault()
    await signOutAction()
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 px-4 py-2.5 backdrop-blur-xl md:hidden">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo variant="icon" preload />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold tracking-[0.16em] text-blue-400/70 uppercase">
                Secure vault
              </p>
              <p className="truncate text-sm leading-tight font-bold">
                {activeItem?.label || "Dashboard"}
              </p>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-amber-500/15 bg-amber-500/5"
            onClick={handleLock}
            aria-label="Lock vault"
          >
            <Lock className="h-4 w-4 text-amber-400" />
          </Button>
        </div>
      </header>

      <nav
        aria-label="Mobile dashboard navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/90 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] backdrop-blur-2xl md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {primaryNavigation.map((item) => {
            const isActive = routeIsActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-muted-foreground active:bg-muted/60 active:text-foreground"
                }`}
              >
                <item.icon
                  className={`h-[18px] w-[18px] ${isActive ? "stroke-[2.4]" : ""}`}
                />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-controls="mobile-dashboard-more"
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${
              moreOpen || secondaryRouteActive
                ? "bg-blue-500/10 text-blue-400"
                : "text-muted-foreground active:bg-muted/60 active:text-foreground"
            }`}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />

          <section
            id="mobile-dashboard-more"
            role="dialog"
            aria-modal="true"
            aria-label="More dashboard options"
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] border border-b-0 border-border/60 bg-card px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-bold">More options</p>
                <p className="text-xs text-muted-foreground">
                  Manage your vault and account
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navigation.slice(4).map((item) => {
                const isActive = routeIsActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-blue-500/25 bg-blue-500/10 text-blue-400"
                        : "border-border/50 bg-background/40 text-foreground"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-4">
              <button
                type="button"
                onClick={handleLock}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-3 text-sm font-semibold text-amber-400"
              >
                <Lock className="h-4 w-4" />
                Lock vault
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-3 py-3 text-sm font-semibold text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
