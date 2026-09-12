import "server-only";

import { envSender, type ResolvedSender } from "./email";

// Phase 2: the only sender available is the operator-wide env fallback.
// Phase 4 replaces resolveSender's body with: check this user's own
// sending_accounts row first, fall back to envSender() second, so this
// function is the one place outreach/calling code should call rather than
// importing envSender() directly — the resolution order can change here
// without touching any caller.

export async function resolveSender(_userId: string): Promise<ResolvedSender | null> {
  return envSender();
}

export async function resolveSenderName(userId: string): Promise<string> {
  const sender = await resolveSender(userId);
  return sender?.fromName || "me";
}

export async function isSendingConfigured(userId: string): Promise<boolean> {
  return (await resolveSender(userId)) !== null;
}
