"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserVaultStatus } from "@/lib/actions/vault"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { subscribeBroadcast } from "@/lib/storage/broadcast-channel"
import { loadAutoLockPreferences } from "@/lib/security/auto-lock"
import { flushSyncQueue } from "@/lib/sync-engine"

export function VaultGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isUnlocked = useVaultSessionStore((s) => s.isUnlocked)
  const autoLockMinutes = useVaultSessionStore((s) => s.autoLockMinutes)
  const lockWhenHidden = useVaultSessionStore((s) => s.lockWhenHidden)
  const lockVault = useVaultSessionStore((s) => s.lockVault)
  const updateActivity = useVaultSessionStore((s) => s.updateActivity)
  const setAutoLockPreferences = useVaultSessionStore(
    (s) => s.setAutoLockPreferences
  )

  const [loading, setLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    const preferences = loadAutoLockPreferences()
    setAutoLockPreferences(preferences.minutes, preferences.lockWhenHidden)
  }, [setAutoLockPreferences])

  useEffect(() => {
    async function verifyGuard() {
      if (!navigator.onLine) {
        if (isUnlocked) {
          setStatusError(null)
          setLoading(false)
        } else {
          router.replace("/offline")
        }
        return
      }

      try {
        const status = await getUserVaultStatus()
        if (status.error) {
          setStatusError(status.error)
          setLoading(false)
        } else if (!status.authenticated) {
          router.push("/login")
        } else if (!status.hasVault) {
          router.push("/setup")
        } else if (!isUnlocked) {
          router.push("/unlock")
        } else {
          setStatusError(null)
          setLoading(false)
          void flushSyncQueue()
        }
      } catch {
        if (isUnlocked) {
          setStatusError(null)
          setLoading(false)
        } else {
          router.replace("/offline")
        }
      }
    }
    verifyGuard()
  }, [router, isUnlocked])

  useEffect(() => {
    const unsubscribe = subscribeBroadcast((msg) => {
      if (msg.type === "VAULT_LOCKED") {
        lockVault()
        router.push("/unlock")
      }
    })
    return unsubscribe
  }, [lockVault, router])

  useEffect(() => {
    if (!isUnlocked) return

    updateActivity()

    const interval = setInterval(() => {
      const elapsedMinutes =
        (Date.now() - useVaultSessionStore.getState().lastActivityTimestamp) /
        (1000 * 60)
      if (elapsedMinutes >= autoLockMinutes) {
        lockVault()
        router.push("/unlock")
      }
    }, 5000)

    const handleUserActivity = () => {
      updateActivity()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && lockWhenHidden) {
        lockVault()
      } else if (document.visibilityState === "visible") {
        updateActivity()
      }
    }
    window.addEventListener("pointerdown", handleUserActivity)
    window.addEventListener("keydown", handleUserActivity)
    window.addEventListener("touchstart", handleUserActivity, { passive: true })
    window.addEventListener("scroll", handleUserActivity, { passive: true })
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener("pointerdown", handleUserActivity)
      window.removeEventListener("keydown", handleUserActivity)
      window.removeEventListener("touchstart", handleUserActivity)
      window.removeEventListener("scroll", handleUserActivity)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [
    isUnlocked,
    autoLockMinutes,
    lockWhenHidden,
    lockVault,
    router,
    updateActivity,
  ])

  if (statusError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-destructive/25 bg-card p-6 text-center">
          <h1 className="text-lg font-bold">Vault service unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{statusError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (loading || !isUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Securing vault session...
      </div>
    )
  }

  return <>{children}</>
}
