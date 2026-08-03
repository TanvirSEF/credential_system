"use client"

import { useState } from "react"
import {
  getAvatarUploadUrlAction,
  setAvatarAction,
} from "@/lib/actions/profile"
import { Avatar } from "@/components/avatar"
import { Camera } from "lucide-react"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function AvatarUpload({
  avatarUrl,
  name,
  onUpdated,
}: {
  avatarUrl: string | null
  name: string
  onUpdated: (avatarUrl: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError(null)

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be 5 MB or smaller.")
      return
    }

    setBusy(true)
    try {
      const presign = await getAvatarUploadUrlAction(file.type)
      if (
        presign.error ||
        !presign.uploadUrl ||
        !presign.publicUrl ||
        !presign.storagePath
      ) {
        setError(presign.error || "Failed to prepare upload.")
        return
      }

      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      if (!put.ok) {
        setError(`Upload failed: ${put.status} ${put.statusText}`)
        return
      }

      const save = await setAvatarAction(presign.storagePath)
      if (save.error) {
        setError(save.error)
        return
      }

      onUpdated(save.publicUrl || presign.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="group relative cursor-pointer" title="Change avatar">
        <Avatar
          avatarUrl={avatarUrl}
          name={name}
          className="h-24 w-24 text-2xl"
        />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" />
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
          disabled={busy}
        />
      </label>
      {busy && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
