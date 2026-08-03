"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The vault hit an unexpected error while rendering this page. Your
        encrypted data is safe on the server. You can try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
