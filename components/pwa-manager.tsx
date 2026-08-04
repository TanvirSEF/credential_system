"use client"

import { useEffect, useState } from "react"
import { Download, RefreshCw, ShieldCheck, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

declare global {
  interface Window {
    __spvInstallPrompt?: InstallPromptEvent
    __spvWaitingWorker?: ServiceWorker
  }
}

const INSTALL_READY_EVENT = "spv:pwa-install-ready"
const INSTALLED_EVENT = "spv:pwa-installed"
const UPDATE_READY_EVENT = "spv:pwa-update-ready"

function isStandalone() {
  if (typeof window === "undefined") return false
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
}

type InstallRequestResult = "accepted" | "dismissed" | "unavailable"

async function requestInstall(): Promise<InstallRequestResult> {
  const prompt = window.__spvInstallPrompt
  if (!prompt) return "unavailable"
  await prompt.prompt()
  const choice = await prompt.userChoice
  if (choice.outcome === "accepted") {
    window.__spvInstallPrompt = undefined
    window.dispatchEvent(new Event(INSTALLED_EVENT))
    return "accepted"
  }
  return "dismissed"
}

function applyUpdate() {
  const worker = window.__spvWaitingWorker
  if (!worker) return
  sessionStorage.setItem("spv-reload-after-update", "true")
  worker.postMessage({ type: "SKIP_WAITING" })
}

function usePwaStatus() {
  const [installed, setInstalled] = useState(false)
  const [installAvailable, setInstallAvailable] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandalone())
      setInstallAvailable(Boolean(window.__spvInstallPrompt))
      setUpdateAvailable(Boolean(window.__spvWaitingWorker))
    }
    const markInstalled = () => {
      setInstalled(true)
      setInstallAvailable(false)
    }

    sync()
    window.addEventListener(INSTALL_READY_EVENT, sync)
    window.addEventListener(UPDATE_READY_EVENT, sync)
    window.addEventListener(INSTALLED_EVENT, markInstalled)
    window.addEventListener("appinstalled", markInstalled)
    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, sync)
      window.removeEventListener(UPDATE_READY_EVENT, sync)
      window.removeEventListener(INSTALLED_EVENT, markInstalled)
      window.removeEventListener("appinstalled", markInstalled)
    }
  }, [])

  return { installed, installAvailable, updateAvailable }
}

export function PwaManager() {
  const { installAvailable, updateAvailable } = usePwaStatus()
  const [dismissed, setDismissed] = useState(false)
  const [installRequested, setInstallRequested] = useState(false)

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      window.__spvInstallPrompt = event as InstallPromptEvent
      setDismissed(false)
      window.dispatchEvent(new Event(INSTALL_READY_EVENT))
    }
    const handleInstalled = () => {
      window.__spvInstallPrompt = undefined
      setInstallRequested(false)
      setDismissed(true)
      window.dispatchEvent(new Event(INSTALLED_EVENT))
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          const announceUpdate = (worker: ServiceWorker) => {
            window.__spvWaitingWorker = worker
            setDismissed(false)
            window.dispatchEvent(new Event(UPDATE_READY_EVENT))
          }

          if (registration.waiting) announceUpdate(registration.waiting)
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing
            if (!worker) return
            worker.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                announceUpdate(worker)
              }
            })
          })
          void registration.update()
        })
        .catch((error) => console.warn("PWA registration failed:", error))

      const handleControllerChange = () => {
        if (sessionStorage.getItem("spv-reload-after-update") !== "true") return
        sessionStorage.removeItem("spv-reload-after-update")
        window.location.reload()
      }
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange
      )

      return () => {
        window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
        window.removeEventListener("appinstalled", handleInstalled)
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange
        )
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  async function handleInstall() {
    const result = await requestInstall()
    setInstallRequested(result === "accepted")
  }

  if (
    dismissed ||
    (!installAvailable && !updateAvailable && !installRequested)
  ) {
    return null
  }

  return (
    <aside className="fixed right-4 bottom-24 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-card/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl md:bottom-5">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-7">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {updateAvailable ? (
            <RefreshCw className="size-5" />
          ) : (
            <Smartphone className="size-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {updateAvailable
              ? "App update ready"
              : "Install Secure Personal Vault"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {updateAvailable
              ? "Apply the latest interface update. Your unlocked vault will lock during reload."
              : installRequested
                ? "Android accepted the request. Wait for Chrome to confirm that installation finished."
                : "Add it to Android for a standalone, full-screen experience."}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="mt-3 w-full"
        disabled={installRequested}
        onClick={updateAvailable ? applyUpdate : () => void handleInstall()}
      >
        {updateAvailable || installRequested ? <RefreshCw /> : <Download />}
        {updateAvailable
          ? "Update and reload"
          : installRequested
            ? "Waiting for Android..."
            : "Install app"}
      </Button>
    </aside>
  )
}

export function PwaSettingsCard() {
  const { installed, installAvailable, updateAvailable } = usePwaStatus()
  const [installRequested, setInstallRequested] = useState(false)

  async function handleInstall() {
    const result = await requestInstall()
    setInstallRequested(result === "accepted")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="size-5" />
          </div>
          <div>
            <CardTitle>Android app</CardTitle>
            <CardDescription className="mt-1">
              Install this vault as a secure standalone web app.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          Only public interface assets are cached. An already-unlocked vault can
          use its encrypted local cache while this app session remains open;
          authenticated pages and decrypted data are never cached.
        </div>

        {updateAvailable ? (
          <Button onClick={applyUpdate}>
            <RefreshCw /> Update and reload
          </Button>
        ) : installed ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
            <ShieldCheck className="size-4" /> Installed on this device
          </div>
        ) : installRequested ? (
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <RefreshCw className="size-4 animate-spin" /> Waiting for Android
            </div>
            Chrome accepted the request but has not confirmed installation yet.
            If it does not finish, close Chrome completely, reopen this HTTPS
            site, and use Chrome menu → Install app.
          </div>
        ) : installAvailable ? (
          <Button onClick={() => void handleInstall()}>
            <Download /> Install app
          </Button>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            On Android Chrome, open the browser menu and choose{" "}
            <strong className="text-foreground">Install app</strong> if the
            install prompt is not currently visible.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
