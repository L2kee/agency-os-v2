export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Access not active</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account isn&rsquo;t active on this workspace. If you think this is a
          mistake, contact the person who invited you.
        </p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
