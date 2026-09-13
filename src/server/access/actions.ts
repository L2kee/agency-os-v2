"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function inviteMember(formData: FormData) {
  await requireAdmin();
  if (!hasAdminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server." };
  }

  const email = (formData.get("email") ?? "").toString().trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?next=/welcome`,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true, email };
}

export async function setMemberActive(userId: string, isActive: boolean) {
  const { user } = await requireAdmin();
  if (userId === user.id) return { error: "You can't change your own access." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) return { error: error.message };

  // Also ban at the auth layer so existing sessions can't keep calling the API.
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : "876000h", // ~100 years
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function setMemberRole(userId: string, role: "member" | "admin") {
  const { user } = await requireAdmin();
  if (userId === user.id) return { error: "You can't change your own role." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export async function removeMember(userId: string) {
  const { user } = await requireAdmin();
  if (userId === user.id) return { error: "You can't remove yourself." };

  const admin = createAdminClient();
  // Cascades: profile + all their leads/emails/etc. via ON DELETE CASCADE.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
