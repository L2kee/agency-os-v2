"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/server/supabase/client";

/**
 * Handles the redirect back from an invite / magic-link / password-reset
 * email. Supabase's admin-generated links (invites, recovery) always come
 * back as an implicit-flow hash fragment (#access_token=...), never a
 * `?code=` param — and fragments never reach the server, so this has to run
 * client-side rather than as a route handler. Reads window.location directly
 * (rather than useSearchParams) since this runs entirely client-side anyway
 * and it sidesteps the Suspense-boundary requirement for no real benefit.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const next = query.get("next") ?? "/";
    const supabase = createClient();

    async function finish() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");

      const { error } = accessToken && refreshToken
        ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : { error: { message: "No session token in the link." } };

      if (error) {
        setError(error.message);
        setTimeout(() => router.replace("/login?error=auth"), 1500);
        return;
      }

      router.replace(next);
      router.refresh();
    }

    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{error ?? "Signing you in…"}</p>
    </div>
  );
}
