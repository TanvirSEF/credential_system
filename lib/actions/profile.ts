"use server"

import { createClient } from "@/lib/supabase/server"
import { profiles } from "@/db/schema"
import { withRls } from "@/db/rls"
import {
  objectKeyForAvatar,
  presignPutUrl,
  publicUrlFor,
} from "@/lib/storage/object-storage"

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

// Maximum accepted avatar size. Enforced server-side at presign time by
// binding Content-Length into the signed PUT URL (mirrors the document
// upload path). The client keeps a matching constant in avatar-upload.tsx.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export async function getProfileAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const authFullName = (user.user_metadata?.full_name as string) || ""

  const upserted = await withRls(user.id, (tx) =>
    tx
      .insert(profiles)
      .values({
        id: user.id,
        fullName: authFullName || user.email || "User",
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { updatedAt: new Date() },
      })
      .returning({
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
      })
  )

  return {
    email: user.email || "",
    fullName: upserted[0]?.fullName ?? authFullName,
    avatarUrl: upserted[0]?.avatarUrl ?? null,
  }
}

export async function getAvatarUploadUrlAction(
  contentType: string,
  size: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated." }

  const ext = ALLOWED_AVATAR_TYPES[contentType]
  if (!ext) {
    return {
      error: "Unsupported image type. Use PNG, JPEG, or WebP.",
    }
  }

  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_AVATAR_BYTES) {
    return { error: "Avatar must be 5 MB or smaller." }
  }

  const key = objectKeyForAvatar(user.id, ext)
  const uploadUrl = await presignPutUrl(key, contentType, 120, size)
  return {
    error: null,
    storagePath: key,
    uploadUrl,
    publicUrl: publicUrlFor(key),
  }
}

export async function setAvatarAction(storagePath: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated." }

  if (!storagePath.startsWith(`avatars/${user.id}/`)) {
    return { error: "Invalid avatar path." }
  }

  const publicUrl = publicUrlFor(storagePath)

  const authFullName = (user.user_metadata?.full_name as string) || ""

  await withRls(user.id, (tx) =>
    tx
      .insert(profiles)
      .values({
        id: user.id,
        fullName: authFullName || user.email || "User",
        avatarUrl: publicUrl,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { avatarUrl: publicUrl, updatedAt: new Date() },
      })
  )

  return { success: true, publicUrl }
}

export async function updateProfileNameAction(fullName: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated." }

  const name = fullName.trim()
  if (name.length < 1 || name.length > 80) {
    return { error: "Name must be 1–80 characters." }
  }

  await withRls(user.id, (tx) =>
    tx
      .insert(profiles)
      .values({ id: user.id, fullName: name })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { fullName: name, updatedAt: new Date() },
      })
  )

  return { success: true }
}
