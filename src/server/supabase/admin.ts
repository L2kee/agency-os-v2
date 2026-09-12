import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasAdminClient = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

/**
 * Service-role client — bypasses RLS. Server-only, never imported into a
 * Client Component. Used by the scheduled sequence processor (acts across all
 * users) and by the access-control domain (invite/deactivate/remove, which
 * needs the Supabase Auth admin API).
 */
export function createAdminClient() {
  if (!hasAdminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
