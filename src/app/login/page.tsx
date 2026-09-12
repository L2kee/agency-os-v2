"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/server/supabase/client";
import { hasSupabaseEnv } from "@/server/supabase/env";
import { SetupNotice } from "@/components/setup-notice";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!hasSupabaseEnv) return <SetupNotice />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function sendReset() {
    if (!email) {
      setStatus("Enter your email first.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/welcome`,
    });
    setResetSent(true);
    setStatus(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Agency OS</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "…" : "Sign in"}
          </button>
        </form>

        {status && (
          <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{status}</p>
        )}
        {resetSent && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            If that email has an account, a reset link is on its way.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <button onClick={sendReset} className="underline hover:text-slate-700">
            Forgot password?
          </button>
          <span>Invite only</span>
        </div>
      </div>
    </div>
  );
}
