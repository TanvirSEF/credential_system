"use server";

import { createClient } from "@/lib/supabase/server";
import { profiles } from "@/db/schema";
import { withRls } from "@/db/rls";
import {
  r2KeyForAvatar,
  presignPutUrl,
  publicUrlFor,
} from "@/lib/r2/client";

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function getProfileAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const authFullName = (user.user_metadata?.full_name as string) || "";

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
  );

  return {
    email: user.email || "",
    fullName: upserted[0]?.fullName ?? authFullName,
    avatarUrl: upserted[0]?.avatarUrl ?? null,
  };
}

export async function getAvatarUploadUrlAction(contentType: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const ext = ALLOWED_AVATAR_TYPES[contentType];
  if (!ext) {
    return {
      error: "Unsupported image type. Use PNG, JPEG, or WebP.",
    };
  }

  const key = r2KeyForAvatar(user.id, ext);
  const uploadUrl = await presignPutUrl(key, contentType, 120);
  return {
    error: null,
    storagePath: key,
    uploadUrl,
    publicUrl: publicUrlFor(key),
  };
}

export async function setAvatarAction(storagePath: string, publicUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!storagePath.startsWith(`avatars/${user.id}/`)) {
    return { error: "Invalid avatar path." };
  }

  const authFullName = (user.user_metadata?.full_name as string) || "";

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
  );

  return { success: true };
}

export async function updateProfileNameAction(fullName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const name = fullName.trim();
  if (name.length < 1 || name.length > 80) {
    return { error: "Name must be 1–80 characters." };
  }

  await withRls(user.id, (tx) =>
    tx
      .insert(profiles)
      .values({ id: user.id, fullName: name })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { fullName: name, updatedAt: new Date() },
      })
  );

  return { success: true };
}
