import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { hasSupabaseEnv } from "@/server/supabase/env";

/**
 * Authenticated user for the current request. Redirects to /login if signed
 * out. Use this at the top of every server-rendered page and every Server
 * Action under src/app/(app)/**.
 *
 * Phase 5 (access control) extends this with a profile/role/active check —
 * see src/server/access/index.ts once that phase lands.
 */
export async function requireUser() {
  if (!hasSupabaseEnv) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return { supabase, user };
}
