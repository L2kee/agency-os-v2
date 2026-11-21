"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";
import type { OrgRole } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Admin = ReturnType<typeof createAdminClient>;

// Every action works on the admin's own organization only. A user id from
// another organization is treated as not found.
async function findMember(admin: Admin, orgId: string, userId: string) {
  const { data } = await admin
    .from("organization_members")
    .select("user_id, role, is_active")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as { user_id: string; role: OrgRole; is_active: boolean } | null;
}

// Bans at the auth layer only when the person has no other active team, so
// deactivating them here never locks them out of another organization.
async function syncAuthBan(admin: Admin, userId: string) {
  const { count } = await admin
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);
  await admin.auth.admin.updateUserById(userId, {
    // About 100 years.
    ban_duration: (count ?? 0) > 0 ? "none" : "876000h",
  });
}

export async function inviteMember(formData: FormData) {
  const { org } = await requireAdmin();
  if (!hasAdminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server." };
  }

  const email = (formData.get("email") ?? "").toString().trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?next=/welcome`,
  });
  if (error) {
    // Adding someone who already has an account on another team needs the
    // multi team switcher (Phase 5).
    return { error: error.message };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: data.user.id, role: "member" });
  if (memberError) {
    return { error: `Invite sent, but adding them to the team failed: ${memberError.message}` };
  }

  revalidatePath("/admin");
  return { ok: true, email };
}

export async function setMemberActive(userId: string, isActive: boolean) {
  const { user, org } = await requireAdmin();
  if (userId === user.id) {
    return { error: "You can't change your own access." };
  }

  const admin = createAdminClient();
  const member = await findMember(admin, org.id, userId);
  if (!member) {
    return { error: "That person isn't on your team." };
  }
  if (member.role === "owner") {
    return { error: "The owner can't be deactivated." };
  }

  const { error } = await admin
    .from("organization_members")
    .update({ is_active: isActive })
    .eq("organization_id", org.id)
    .eq("user_id", userId);
  if (error) {
    return { error: error.message };
  }

  await syncAuthBan(admin, userId);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setMemberRole(userId: string, role: "member" | "admin") {
  const { user, org } = await requireAdmin();
  if (userId === user.id) {
    return { error: "You can't change your own role." };
  }
  if (role !== "member" && role !== "admin") {
    return { error: "Unknown role." };
  }

  const admin = createAdminClient();
  const member = await findMember(admin, org.id, userId);
  if (!member) {
    return { error: "That person isn't on your team." };
  }
  if (member.role === "owner") {
    return { error: "The owner's role can't be changed." };
  }

  const { error } = await admin
    .from("organization_members")
    .update({ role })
    .eq("organization_id", org.id)
    .eq("user_id", userId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

// Hands the person's shared leads, deals, and customers to the admin doing
// the removal (so the team keeps them), drops their personal rows, and takes
// them off the team. The login itself is deleted only if they're on no other
// team, because deleting it would cascade through every row they own.
export async function removeMember(userId: string) {
  const { user, org } = await requireAdmin();
  if (userId === user.id) {
    return { error: "You can't remove yourself." };
  }

  const admin = createAdminClient();
  const member = await findMember(admin, org.id, userId);
  if (!member) {
    return { error: "That person isn't on your team." };
  }
  if (member.role === "owner") {
    return { error: "The owner can't be removed." };
  }

  const { error: transferError } = await admin.rpc("transfer_member_rows", {
    p_org: org.id,
    p_from: userId,
    p_to: user.id,
  });
  if (transferError) {
    return { error: `Couldn't hand over their records: ${transferError.message}` };
  }

  const { error } = await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", org.id)
    .eq("user_id", userId);
  if (error) {
    return { error: error.message };
  }

  const { count } = await admin
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) === 0) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return { error: `Removed from the team, but deleting the login failed: ${deleteError.message}` };
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}
