import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/auth";
import { isSendingConfigured, resolveSender } from "@/server/sending-accounts";
import { sendViaResend } from "@/server/sending-accounts/email";
import { mergeValues, renderMerge } from "./merge";
import type {
  EmailMessage,
  EmailTemplate,
  Sequence,
  SequenceEnrollment,
  SequenceStep,
} from "./types";
import type { Lead } from "@/server/leads/types";

// Read-only queries used by Server Components. deliverEmail() and
// processDueEnrollments() are the exception to "always call requireUser()
// internally": the hourly cron processes every user with the admin
// (service-role) client, not a signed-in request, so they take an explicit
// supabase client + userId instead. Every caller (the "use server" actions in
// ./actions.ts, and the cron route handler) supplies the right one.

export async function listTemplates(): Promise<EmailTemplate[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as EmailTemplate[];
}

export async function listSequences(): Promise<Sequence[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("sequences")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Sequence[];
}

export async function listActiveSequences(): Promise<Pick<Sequence, "id" | "name">[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("sequences")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getSequence(id: string): Promise<Sequence | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("sequences").select("*").eq("id", id).single();
  return (data as Sequence) ?? null;
}

export async function listSequenceSteps(sequenceId: string): Promise<SequenceStep[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });
  return (data ?? []) as SequenceStep[];
}

/** How many active enrollments each sequence currently has (for the list page). */
export async function countActiveEnrollmentsBySequence(): Promise<Map<string, number>> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("sequence_enrollments").select("sequence_id, status");
  const map = new Map<string, number>();
  for (const e of data ?? []) {
    if (e.status === "active") map.set(e.sequence_id, (map.get(e.sequence_id) ?? 0) + 1);
  }
  return map;
}

export async function listEnrollmentsForLead(leadId: string): Promise<SequenceEnrollment[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("sequence_enrollments")
    .select("*")
    .eq("lead_id", leadId);
  return (data ?? []) as SequenceEnrollment[];
}

export async function listEmailMessagesForLead(leadId: string): Promise<EmailMessage[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("email_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EmailMessage[];
}

export interface OutreachQueueData {
  due: (SequenceEnrollment & { leadName?: string; sequenceName?: string })[];
  upcoming: (SequenceEnrollment & { leadName?: string; sequenceName?: string })[];
  recentEmails: (EmailMessage & { leadName?: string })[];
  sendingReady: boolean;
}

export async function getOutreachQueueData(userId: string): Promise<OutreachQueueData> {
  const { supabase } = await requireUser();
  const sendingReady = await isSendingConfigured(userId);

  const [{ data: enrollments }, { data: leads }, { data: sequences }, { data: emails }] =
    await Promise.all([
      supabase
        .from("sequence_enrollments")
        .select("*")
        .eq("status", "active")
        .order("next_run_at", { ascending: true }),
      supabase.from("leads").select("id, business_name, email"),
      supabase.from("sequences").select("id, name"),
      supabase
        .from("email_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const leadMap = new Map(
    ((leads ?? []) as Pick<Lead, "id" | "business_name" | "email">[]).map((l) => [l.id, l]),
  );
  const seqMap = new Map(((sequences ?? []) as Pick<Sequence, "id" | "name">[]).map((s) => [s.id, s.name]));

  const now = Date.now();
  const enrList = (enrollments ?? []) as SequenceEnrollment[];
  const due = enrList.filter((e) => e.next_run_at && new Date(e.next_run_at).getTime() <= now);
  const upcoming = enrList.filter((e) => !e.next_run_at || new Date(e.next_run_at).getTime() > now);

  const withNames = (e: SequenceEnrollment) => ({
    ...e,
    leadName: leadMap.get(e.lead_id)?.business_name,
    sequenceName: seqMap.get(e.sequence_id),
  });

  return {
    due: due.map(withNames),
    upcoming: upcoming.map(withNames),
    recentEmails: ((emails ?? []) as EmailMessage[]).map((m) => ({
      ...m,
      leadName: leadMap.get(m.lead_id)?.business_name,
    })),
    sendingReady,
  };
}

/**
 * Render + send one email to a lead, record it in email_messages, and log an
 * activity. Used by the manual "send" action and the sequence processor.
 */
export async function deliverEmail(params: {
  supabase: SupabaseClient;
  userId: string;
  lead: Lead;
  subject: string;
  text: string;
  enrollmentId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, lead, enrollmentId } = params;

  if (!lead.email) return { ok: false, error: "This lead has no email address." };

  const sender = await resolveSender(userId);
  if (!sender) {
    return {
      ok: false,
      error: "No sending account. Add your email provider in Settings before sending.",
    };
  }

  const values = mergeValues(lead, sender.fromName || "me");
  const subject = renderMerge(params.subject, values);
  const text = renderMerge(params.text, values);

  const { data: msg, error: insertErr } = await supabase
    .from("email_messages")
    .insert({
      user_id: userId,
      lead_id: lead.id,
      enrollment_id: enrollmentId ?? null,
      to_email: lead.email,
      subject,
      body: text,
      status: "queued",
    })
    .select("id")
    .single();

  if (insertErr || !msg) {
    return { ok: false, error: insertErr?.message ?? "Could not queue email." };
  }

  const result = await sendViaResend(sender, {
    messageId: msg.id,
    to: lead.email,
    subject,
    text,
  });

  await supabase
    .from("email_messages")
    .update({
      status: result.ok ? "sent" : "failed",
      provider_id: result.providerId ?? null,
      error: result.error ?? null,
      sent_at: result.ok ? new Date().toISOString() : null,
    })
    .eq("id", msg.id);

  await supabase.from("activities").insert({
    user_id: userId,
    lead_id: lead.id,
    type: "email",
    body: result.ok ? `Sent email: "${subject}"` : `Email FAILED ("${subject}"): ${result.error}`,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/**
 * Process every enrollment that is due (status active, next_run_at <= now)
 * for this user. Sends the next step, advances the enrollment, schedules the
 * step after that, or completes the enrollment when steps run out.
 */
export async function processDueEnrollments(params: {
  supabase: SupabaseClient;
  userId: string;
  now?: Date;
}): Promise<{ processed: number; sent: number; failed: number }> {
  const { supabase, userId } = params;
  const now = params.now ?? new Date();

  const { data: due } = await supabase
    .from("sequence_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("next_run_at", now.toISOString());

  let sent = 0;
  let failed = 0;

  for (const enr of due ?? []) {
    const { data: steps } = await supabase
      .from("sequence_steps")
      .select("*")
      .eq("sequence_id", enr.sequence_id)
      .order("step_order", { ascending: true });

    const ordered = (steps ?? []) as SequenceStep[];
    const step = ordered[enr.current_step];

    if (!step) {
      await supabase
        .from("sequence_enrollments")
        .update({ status: "completed", next_run_at: null })
        .eq("id", enr.id);
      continue;
    }

    const { data: lead } = await supabase.from("leads").select("*").eq("id", enr.lead_id).single();

    if (!lead) {
      await supabase
        .from("sequence_enrollments")
        .update({ status: "stopped", next_run_at: null })
        .eq("id", enr.id);
      continue;
    }

    const res = await deliverEmail({
      supabase,
      userId,
      lead: lead as Lead,
      subject: step.subject,
      text: step.body,
      enrollmentId: enr.id,
    });
    if (res.ok) sent++;
    else failed++;

    const nextStep = ordered[enr.current_step + 1];
    if (nextStep) {
      const next = new Date(now);
      next.setDate(next.getDate() + Math.max(0, nextStep.day_offset));
      await supabase
        .from("sequence_enrollments")
        .update({ current_step: enr.current_step + 1, next_run_at: next.toISOString() })
        .eq("id", enr.id);
    } else {
      await supabase
        .from("sequence_enrollments")
        .update({ current_step: enr.current_step + 1, status: "completed", next_run_at: null })
        .eq("id", enr.id);
    }
  }

  return { processed: due?.length ?? 0, sent, failed };
}
