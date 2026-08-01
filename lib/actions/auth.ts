"use server";

import { createClient } from "@/lib/supabase/server";
import { profiles } from "@/db/schema";
import { withRls } from "@/db/rls";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn("Login failed:", error.message);
      return { error: "Invalid email or password." };
    }
  } catch (error) {
    console.error("Authentication service failure:", error);
    return {
      error:
        "Authentication service is unavailable. Check the deployment configuration and try again.",
    };
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
    console.warn("Sign up failed:", error.message);
    return { error: "Could not create account. Please try again." };
  }

  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUserProfileAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const authFullName = (user.user_metadata?.full_name as string) || "";

  let fullName = authFullName;
  let avatarUrl: string | null = null;
  try {
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
        .returning({ fullName: profiles.fullName, avatarUrl: profiles.avatarUrl })
    );

    fullName = upserted[0]?.fullName ?? authFullName;
    avatarUrl = upserted[0]?.avatarUrl ?? null;
  } catch (err) {
    console.warn("Profile sync notice:", err);
  }

  return {
    email: user.email || "",
    fullName,
    avatarUrl,
  };
}
