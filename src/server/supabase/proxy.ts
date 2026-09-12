import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/auth", "/api/track", "/api/cron"];

/** Refresh the Supabase session cookie and gate unauthenticated access. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not configured yet — let the app render its setup screen.
  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Carry any refreshed auth cookies onto a redirect response so we never
  // strand a half-rotated session.
  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && !isPublic) {
    // Don't bounce data-only requests (Server Action / RSC) to /login — let
    // the action's own auth check handle it, so a transient refresh race
    // during a mutation doesn't throw the user out mid-task.
    const isDataRequest =
      request.headers.get("next-action") !== null || request.headers.get("rsc") === "1";
    if (!isDataRequest) return redirectTo("/login");
  }

  if (user && pathname === "/login") {
    return redirectTo("/");
  }

  return response;
}
