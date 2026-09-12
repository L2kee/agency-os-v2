import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/auth";
import { decryptSecret, hasEncryptionKey } from "./crypto";
import { envSender, type ResolvedSender } from "./email";
import type { SendingAccount } from "./types";

// The one place outreach/calling code should call rather than importing
// envSender() directly — the resolution order lives here so it can change
// without touching any caller.
//
// `supabase` is optional: request-context callers (Server Components,
// Server Actions) can omit it and get their own client via requireUser().
// deliverEmail() runs from the cron processor too, where there's no logged-in
// session — it already has an admin-scoped client from its caller, so it
// passes that through instead of trying to establish a request session.
export async function resolveSender(
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<ResolvedSender | null> {
  const supabase = supabaseClient ?? (await requireUser()).supabase;

  const { data } = await supabase
    .from("sending_accounts")
    .select("provider, from_email, from_name, secret_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.secret_encrypted && data.provider === "resend" && data.from_email && hasEncryptionKey) {
    try {
      return {
        provider: "resend",
        fromEmail: data.from_email,
        fromName: data.from_name ?? "",
        apiKey: decryptSecret(data.secret_encrypted),
        origin: "user",
      };
    } catch {
      // Ciphertext doesn't decrypt under the current APP_ENCRYPTION_KEY
      // (e.g. the key rotated) — fall through to the env fallback rather
      // than hard-failing every send for this user.
    }
  }

  return envSender();
}

export async function resolveSenderName(userId: string): Promise<string> {
  const sender = await resolveSender(userId);
  return sender?.fromName || "me";
}

export async function isSendingConfigured(userId: string): Promise<boolean> {
  return (await resolveSender(userId)) !== null;
}

/** The signed-in user's own sending account, if they've set one up. Never includes the ciphertext. */
export async function getSendingAccount(): Promise<(SendingAccount & { hasKey: boolean }) | null> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("sending_accounts")
    .select("id, user_id, provider, from_email, from_name, status, last_error, last_verified_at, created_at, updated_at, secret_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  const { secret_encrypted, ...rest } = data;
  return { ...(rest as SendingAccount), hasKey: Boolean(secret_encrypted) };
}

export { hasEncryptionKey } from "./crypto";
export { envSender } from "./email";

// Re-exported so Server Components can do
// `import { saveSendingAccount, sendTestEmail } from "@/server/sending-accounts"` uniformly.
// Client Components must import actions directly from "@/server/sending-accounts/actions".
export { saveSendingAccount, sendTestEmail, disconnectSendingAccount } from "./actions";
