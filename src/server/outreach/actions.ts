"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import type { Lead } from "@/server/leads/types";
import { deliverEmail, processDueEnrollments } from "./index";
import type { SequenceStep } from "./types";

// Server Actions the outreach UI (templates, sequences, the lead detail
// page's email panel, the outreach queue) calls directly.

export async function saveTemplate(input: { id?: string; name: string; subject: string; body: string }) {
  const { supabase, user } = await requireUser();
  const name = input.name.trim() || "Untitled template";

  if (input.id) {
    const { error } = await supabase
      .from("email_templates")
      .update({ name, subject: input.subject, body: input.body })
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("email_templates")
      .insert({ user_id: user.id, name, subject: input.subject, body: input.body });
    if (error) return { error: error.message };
  }

  revalidatePath("/templates");
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("email_templates").delete().eq("id", id);
  revalidatePath("/templates");
}

export async function createSequence(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = (formData.get("name") ?? "").toString().trim() || "New sequence";

  const { data, error } = await supabase
    .from("sequences")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Seed one step so the sequence is usable immediately.
  await supabase.from("sequence_steps").insert({
    user_id: user.id,
    sequence_id: data.id,
    step_order: 1,
    day_offset: 0,
    subject: "Quick question about {{business_name}}",
    body:
      "Hi {{first_name}},\n\nI help {{category}} businesses in {{city}} get more customers with a modern website. I put together a few ideas for {{business_name}} — worth a quick look?\n\n{{sender_name}}",
  });

  revalidatePath("/sequences");
  redirect(`/sequences/${data.id}`);
}

export async function renameSequence(id: string, name: string) {
  const { supabase } = await requireUser();
  await supabase.from("sequences").update({ name: name.trim() || "Untitled" }).eq("id", id);
  revalidatePath(`/sequences/${id}`);
  revalidatePath("/sequences");
}

export async function setSequenceActive(id: string, isActive: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("sequences").update({ is_active: isActive }).eq("id", id);
  revalidatePath(`/sequences/${id}`);
  revalidatePath("/sequences");
}

export async function deleteSequence(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("sequences").delete().eq("id", id);
  revalidatePath("/sequences");
  redirect("/sequences");
}

export async function saveSteps(
  sequenceId: string,
  steps: Array<Pick<SequenceStep, "id" | "day_offset" | "subject" | "body">>,
) {
  const { supabase, user } = await requireUser();

  // Replace the step set wholesale — simplest correct approach for a small list.
  await supabase.from("sequence_steps").delete().eq("sequence_id", sequenceId);

  if (steps.length > 0) {
    const rows = steps.map((s, i) => ({
      user_id: user.id,
      sequence_id: sequenceId,
      step_order: i + 1,
      day_offset: Math.max(0, Math.round(s.day_offset) || 0),
      subject: s.subject,
      body: s.body,
    }));
    const { error } = await supabase.from("sequence_steps").insert(rows);
    if (error) return { error: error.message };
  }

  revalidatePath(`/sequences/${sequenceId}`);
  return { ok: true };
}

export async function sendLeadEmailNow(leadId: string, input: { subject: string; body: string }) {
  const { supabase, user } = await requireUser();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) return { error: "Lead not found." };

  const res = await deliverEmail({
    supabase,
    userId: user.id,
    lead: lead as Lead,
    subject: input.subject,
    text: input.body,
  });

  revalidatePath(`/leads/${leadId}`);
  return res.ok ? { ok: true } : { error: res.error };
}

export async function enrollLeadInSequence(leadId: string, sequenceId: string) {
  const { supabase, user } = await requireUser();

  const { data: lead } = await supabase.from("leads").select("email").eq("id", leadId).single();
  if (!lead?.email) return { error: "Add an email address to this lead first." };

  const { data: steps } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  const first = (steps ?? [])[0] as SequenceStep | undefined;
  if (!first) return { error: "That sequence has no steps yet." };

  const next = new Date();
  next.setDate(next.getDate() + Math.max(0, first.day_offset));

  const { error } = await supabase.from("sequence_enrollments").upsert(
    {
      user_id: user.id,
      lead_id: leadId,
      sequence_id: sequenceId,
      status: "active",
      current_step: 0,
      next_run_at: next.toISOString(),
    },
    { onConflict: "lead_id,sequence_id" },
  );
  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    user_id: user.id,
    lead_id: leadId,
    type: "note",
    body: "Enrolled in a follow-up sequence",
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/outreach");
  return { ok: true };
}

export async function stopEnrollment(leadId: string, enrollmentId: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("sequence_enrollments")
    .update({ status: "stopped", next_run_at: null })
    .eq("id", enrollmentId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/outreach");
}

export async function markLeadReplied(leadId: string) {
  const { supabase, user } = await requireUser();

  await supabase
    .from("sequence_enrollments")
    .update({ status: "replied", next_run_at: null })
    .eq("lead_id", leadId)
    .eq("status", "active");

  await supabase.from("activities").insert({
    user_id: user.id,
    lead_id: leadId,
    type: "note",
    body: "Lead replied — sequences stopped",
  });

  // Nudge the pipeline forward if it's still early.
  await supabase.from("leads").update({ stage: "interested" }).eq("id", leadId).in("stage", [
    "new",
    "contacted",
  ]);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/outreach");
}

export async function runDueNow() {
  const { supabase, user } = await requireUser();
  const result = await processDueEnrollments({ supabase, userId: user.id });
  revalidatePath("/outreach");
  revalidatePath("/leads");
  return result;
}
