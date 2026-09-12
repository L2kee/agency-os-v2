"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase client for Client Components. This is used ONLY for the auth
 * session handshake (sign in, sign out, set password, password reset) on the
 * login/welcome screens — never for reading or writing app data. All data
 * access lives in src/server/<domain>/*.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
