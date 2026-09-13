import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { hasSupabaseEnv } from "@/server/supabase/env";
import type { Profile } from "@/server/access/types";

/**
 * Authenticated user (+ profile, once phase 5's migration has run) for the
 * current request. Redirects to /login if signed out, and to /pending if
 * their access has been deactivated. Use this at the top of every
 * server-rendered page and every Server Action under src/app/(app)/**.
 */
export async function requireUser() {
  if (!hasSupabaseEnv) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, is_active, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // No profiles table yet, or no row for this user (phase 5's migration
  // hasn't run) — treat as an active member rather than locking everyone out.
  if (profile && profile.is_active === false) redirect("/pending");

  return { supabase, user, profile: (profile ?? null) as Profile | null };
}

/** Like requireUser but also requires role = admin; bounces non-admins to the dashboard. */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== "admin") redirect("/");
  return ctx;
}
