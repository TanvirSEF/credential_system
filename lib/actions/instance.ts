"use server"

import { createClient } from "@/lib/supabase/server"
import { getOwnerUpdateStatus } from "@/lib/instance/updates"

export async function getInstanceUpdateStatusAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { isOwner: false } as const
  return getOwnerUpdateStatus(user.id)
}
