import "server-only";

import { Resend } from "resend";

// Low-level Resend wrapper + the operator-wide env fallback sender. Phase 4
// (per-user sending accounts) adds resolveSender() in ./index.ts, which
// layers a user's own connected account on top of this fallback — see the
// comment there for the resolution order.

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const ENV_RESEND_KEY = process.env.RESEND_API_KEY ?? "";
export const ENV_EMAIL_FROM = process.env.EMAIL_FROM ?? "";
export const ENV_SENDER_NAME = process.env.SENDER_NAME ?? "";
export const envEmailConfigured = Boolean(ENV_RESEND_KEY && ENV_EMAIL_FROM);

export interface ResolvedSender {
  provider: "resend";
  fromEmail: string;
  fromName: string;
  apiKey: string;
  /** "env" (operator fallback) or "user" (their own account, added in Phase 4). */
  origin: "env" | "user";
}

export function envSender(): ResolvedSender | null {
  if (!envEmailConfigured) return null;
  return {
    provider: "resend",
    fromEmail: ENV_EMAIL_FROM,
    fromName: ENV_SENDER_NAME,
    apiKey: ENV_RESEND_KEY,
    origin: "env",
  };
}

/** Plain-text body -> minimal HTML email + open-tracking pixel. */
function toHtml(text: string, messageId: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const pixel = `<img src="${APP_URL}/api/track/open/${messageId}" width="1" height="1" alt="" style="display:none" />`;
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${escaped}</div>${pixel}`;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export async function sendViaResend(
  sender: ResolvedSender,
  opts: {
    messageId: string;
    to: string;
    subject: string;
    text: string;
    replyTo?: string;
    trackOpens?: boolean;
  },
): Promise<SendResult> {
  const resend = new Resend(sender.apiKey);
  const from = sender.fromName ? `${sender.fromName} <${sender.fromEmail}>` : sender.fromEmail;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.trackOpens === false ? undefined : toHtml(opts.text, opts.messageId),
      replyTo: opts.replyTo || undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
