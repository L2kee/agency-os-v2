import "server-only";

import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";
import type { MemberRow } from "./types";

// Combines auth.users (for invite/last-seen status) with the profiles table
// (for role/active) into the rows the Access page renders. Needs the
// service-role client since listing every user isn't something a normal
// session can do.
export async function listMembers(): Promise<MemberRow[]> {
  if (!hasAdminClient) return [];

  const admin = createAdminClient();
  const [{ data: list }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, email, role, is_active, created_at"),
  ]);

  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const rows = (list?.users ?? []).map((u) => {
    const p = pmap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? p?.email ?? "—",
      role: (p?.role ?? "member") as MemberRow["role"],
      isActive: p?.is_active ?? true,
      invitedNotAccepted: Boolean(u.invited_at) && !u.last_sign_in_at,
      lastSignIn: u.last_sign_in_at ?? null,
      createdAt: u.created_at,
    };
  });
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

export type { Profile, MemberRow } from "./types";

// Re-exported so Server Components can do
// `import { inviteMember, setMemberActive, setMemberRole, removeMember } from "@/server/access"` uniformly.
// Client Components must import actions directly from "@/server/access/actions".
export { inviteMember, setMemberActive, setMemberRole, removeMember } from "./actions";
