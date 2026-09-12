export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold">Finish setup</h1>
        <p className="mt-2 text-sm text-slate-600">
          Supabase isn&rsquo;t configured yet. Add your project URL and anon key to{" "}
          <code className="rounded bg-slate-100 px-1">.env.local</code>, then
          restart <code className="rounded bg-slate-100 px-1">npm run dev</code>.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Create a project at supabase.com</li>
          <li>
            Run <code className="rounded bg-slate-100 px-1">supabase/migrations/0001_init.sql</code>{" "}
            in the SQL editor
          </li>
          <li>
            Copy <strong>Settings → API</strong> values into{" "}
            <code className="rounded bg-slate-100 px-1">.env.local</code>
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          Full instructions are in <code>README.md</code>.
        </p>
      </div>
    </div>
  );
}
