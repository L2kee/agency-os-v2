import { requireAdmin } from "@/server/auth";
import { hasAdminClient } from "@/server/supabase/admin";
import { listMembers } from "@/server/access";
import { MemberTable } from "./member-table";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const rows = await listMembers();

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Access</h1>
      <p className="mt-1 text-sm text-slate-500">
        Only people you invite here can use the app. Deactivate anyone to cut off
        access immediately.
      </p>

      {!hasAdminClient && (
        <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          <code>SUPABASE_SERVICE_ROLE_KEY</code> isn&rsquo;t set — inviting and
          deactivating won&rsquo;t work until it is.
        </p>
      )}

      <div className="mt-6">
        <InviteForm />
      </div>

      <div className="mt-6">
        <MemberTable rows={rows} currentUserId={user.id} />
      </div>
    </div>
  );
}
