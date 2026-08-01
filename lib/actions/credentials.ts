"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";

export async function fetchCredentialsAction(vaultId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated.", credentials: [] };
  }

  const rows = await db
    .select()
    .from(credentials)
    .where(
      and(
        eq(credentials.vaultId, vaultId),
        eq(credentials.ownerId, user.id),
        isNull(credentials.deletedAt)
      )
    );

  return { error: null, credentials: rows };
}

export async function fetchTrashCredentialsAction(vaultId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated.", credentials: [] };
  }

  const rows = await db
    .select()
    .from(credentials)
    .where(
      and(
        eq(credentials.vaultId, vaultId),
        eq(credentials.ownerId, user.id),
        isNotNull(credentials.deletedAt)
      )
    );

  return { error: null, credentials: rows };
}

export async function createCredentialAction(payload: {
  vaultId: string;
  typeId?: string;
  payloadCiphertext: string;
  iv: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const inserted = await db
    .insert(credentials)
    .values({
      vaultId: payload.vaultId,
      ownerId: user.id,
      typeId: payload.typeId || null,
      payloadCiphertext: payload.payloadCiphertext,
      iv: payload.iv,
      cryptoVersion: 1,
      schemaVersion: 1,
    })
    .returning();

  return { success: true, newCredential: inserted[0] };
}

export async function updateCredentialAction(payload: {
  id: string;
  typeId?: string;
  payloadCiphertext: string;
  iv: string;
  version: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  await db
    .update(credentials)
    .set({
      typeId: payload.typeId || null,
      payloadCiphertext: payload.payloadCiphertext,
      iv: payload.iv,
      version: payload.version + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(credentials.id, payload.id),
        eq(credentials.ownerId, user.id)
      )
    );

  return { success: true };
}

export async function softDeleteCredentialAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  await db
    .update(credentials)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(credentials.id, id),
        eq(credentials.ownerId, user.id)
      )
    );

  return { success: true };
}

export async function restoreCredentialAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  await db
    .update(credentials)
    .set({ deletedAt: null })
    .where(
      and(
        eq(credentials.id, id),
        eq(credentials.ownerId, user.id)
      )
    );

  return { success: true };
}

export async function permanentDeleteCredentialAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  await db
    .delete(credentials)
    .where(
      and(
        eq(credentials.id, id),
        eq(credentials.ownerId, user.id)
      )
    );

  return { success: true };
}
