"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { encryptSecret, hasEncryptionKey } from "./crypto";
import { sendViaResend } from "./email";
import { resolveSender } from "./index";

// Server Actions callable from Client Components (email-settings.tsx). Read-
// only queries + resolveSender live in ./index.ts — see the note in
// src/server/leads/index.ts for why the split matters.

export async function saveSendingAccount(input: {
  fromName: string;
  fromEmail: string;
  apiKey: string; // empty string = keep the existing key
}) {
  const { supabase, user } = await requireUser();

  if (!hasEncryptionKey) {
    return { error: "Server missing APP_ENCRYPTION_KEY — see .env.local.example." };
  }

  const fromEmail = input.fromEmail.trim();
  const fromName = input.fromName.trim();
  if (!fromEmail || !fromEmail.includes("@")) {
    return { error: "Enter a valid from-address." };
  }

  const patch: Record<string, unknown> = {
    user_id: user.id,
    provider: "resend",
    from_email: fromEmail,
    from_name: fromName,
    status: "unverified",
    last_error: null,
  };

  const key = input.apiKey.trim();
  if (key) {
    if (!key.startsWith("re_")) {
      return { error: "That doesn't look like a Resend API key (starts with re_)." };
    }
    patch.secret_encrypted = encryptSecret(key);
  } else {
    // No new key provided — require one if there's no existing account.
    const { data: existing } = await supabase
      .from("sending_accounts")
      .select("secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing?.secret_encrypted) {
      return { error: "Paste your Resend API key." };
    }
  }

  const { error } = await supabase.from("sending_accounts").upsert(patch, { onConflict: "user_id" });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/outreach");
  return { ok: true };
}

export async function sendTestEmail() {
  const { supabase, user } = await requireUser();

  const sender = await resolveSender(user.id, supabase);
  if (!sender) return { error: "Save your sending account first." };
  if (!user.email) return { error: "Your account has no email address." };

  const result = await sendViaResend(sender, {
    messageId: "test",
    to: user.email,
    subject: "Agency OS — test email",
    text: `This is a test from Agency OS.\n\nIf you're reading this, sending from ${sender.fromEmail} works.\n\n— ${sender.fromName || "Agency OS"}`,
    trackOpens: false,
  });

  const status = result.ok ? "active" : "needs_auth";
  await supabase
    .from("sending_accounts")
    .update({
      status,
      last_error: result.error ?? null,
      last_verified_at: result.ok ? new Date().toISOString() : null,
    })
    .eq("user_id", user.id);

  revalidatePath("/settings");

  return result.ok ? { ok: true, sentTo: user.email } : { error: result.error };
}

export async function disconnectSendingAccount() {
  const { supabase, user } = await requireUser();
  await supabase.from("sending_accounts").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  revalidatePath("/outreach");
  return { ok: true };
}
