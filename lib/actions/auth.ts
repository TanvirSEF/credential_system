"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function registerAction(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName?.trim() || "",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getUserProfileAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const fullName = (user.user_metadata?.full_name as string) || "";

  // Upsert profile record into PostgreSQL profiles table
  try {
    await db
      .insert(profiles)
      .values({
        id: user.id,
        fullName: fullName || user.email || "User",
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          fullName: fullName || user.email || "User",
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.warn("Profile sync notice:", err);
  }

  return {
    email: user.email || "",
    fullName,
  };
}
