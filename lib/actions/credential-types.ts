"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { credentialTypes } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function fetchCredentialTypesAction(vaultId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated.", types: [] };
  }

  const rows = await db
    .select()
    .from(credentialTypes)
    .where(
      and(
        eq(credentialTypes.vaultId, vaultId),
        eq(credentialTypes.ownerId, user.id),
        isNull(credentialTypes.archivedAt)
      )
    );

  return { error: null, types: rows };
}

export async function createCredentialTypeAction(payload: {
  vaultId: string;
  parentId?: string;
  payloadCiphertext: string;
  iv: string;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const inserted = await db
    .insert(credentialTypes)
    .values({
      vaultId: payload.vaultId,
      ownerId: user.id,
      parentId: payload.parentId || null,
      payloadCiphertext: payload.payloadCiphertext,
      iv: payload.iv,
      sortOrder: payload.sortOrder,
      cryptoVersion: 1,
      schemaVersion: 1,
    })
    .returning();

  return { success: true, newType: inserted[0] };
}

export async function archiveCredentialTypeAction(typeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  await db
    .update(credentialTypes)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(credentialTypes.id, typeId),
        eq(credentialTypes.ownerId, user.id)
      )
    );

  return { success: true };
}
