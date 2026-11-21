import "server-only";

import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";
import type { MemberRow, OrgRole } from "./types";

// The rows the Access page renders: one organization's members, with invite
// and last seen status from auth.users. Needs the service role client,
// because reading auth users isn't something a normal session can do.
export async function listMembers(orgId: string): Promise<MemberRow[]> {
  if (!hasAdminClient) {
    return [];
  }

  const admin = createAdminClient();
  const [{ data: list }, { data: members }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from("organization_members")
      .select("user_id, role, is_active, created_at")
      .eq("organization_id", orgId),
  ]);

  const users = new Map((list?.users ?? []).map((authUser) => [authUser.id, authUser]));
  const rows = (members ?? []).map((member) => {
    const authUser = users.get(member.user_id);
    return {
      id: member.user_id,
      email: authUser?.email ?? "Unknown",
      role: member.role as OrgRole,
      isActive: member.is_active,
      invitedNotAccepted: Boolean(authUser?.invited_at) && !authUser?.last_sign_in_at,
      lastSignIn: authUser?.last_sign_in_at ?? null,
      createdAt: member.created_at,
    };
  });
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

export type { Profile, MemberRow, OrgContext, OrgRole } from "./types";

// Re-exported so Server Components can import everything from "@/server/access".
// Client Components must import actions directly from "@/server/access/actions".
export { inviteMember, setMemberActive, setMemberRole, removeMember } from "./actions";
