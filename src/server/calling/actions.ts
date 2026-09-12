"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { logActivity } from "@/server/leads";
import { moveLeadToStage } from "@/server/pipeline/actions";
import { isStageId } from "@/server/pipeline/stages";
import { outcomeById } from "@/server/playbook/data";

// Server Actions callable from Client Components (call-panel.tsx, note.tsx).
// Read-only queries + re-exports live in ./index.ts — see the note in
// src/server/leads/index.ts for why the split matters.

/**
 * One-click outcome logging from Call Mode: writes the structured call_logs
 * row, a matching activity-timeline entry, an optional stage move (reusing
 * the pipeline domain's moveLeadToStage so sequence auto-stop on won/lost
 * stays centralized in one place), and an optional follow-up date.
 */
export async function logCallOutcome(
  leadId: string,
  input: { outcome: string; notes: string; followUpDays: number | null; moveStage: boolean },
) {
  const { supabase, user } = await requireUser();

  const outcome = outcomeById(input.outcome);
  if (!outcome) return { error: "Unknown outcome" };

  const notes = input.notes.trim();

  await supabase.from("call_logs").insert({
    user_id: user.id,
    lead_id: leadId,
    outcome: outcome.id,
    notes: notes || null,
  });

  await logActivity({
    leadId,
    type: "call",
    body: `Call — ${outcome.label}${notes ? `: ${notes}` : ""}`,
  });

  if (input.followUpDays && input.followUpDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + input.followUpDays);
    await supabase.from("leads").update({ next_follow_up_at: d.toISOString() }).eq("id", leadId);
  }

  if (input.moveStage && outcome.moveTo && isStageId(outcome.moveTo)) {
    await moveLeadToStage(leadId, outcome.moveTo);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true };
}

export async function clearFollowUp(leadId: string) {
  const { supabase } = await requireUser();
  await supabase.from("leads").update({ next_follow_up_at: null }).eq("id", leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

/** Pin a personal note to a playbook script or objection card. Empty note deletes it. */
export async function savePlaybookNote(itemKey: string, note: string) {
  const { supabase, user } = await requireUser();

  if (note.trim() === "") {
    await supabase.from("playbook_notes").delete().eq("user_id", user.id).eq("item_key", itemKey);
  } else {
    await supabase.from("playbook_notes").upsert(
      { user_id: user.id, item_key: itemKey, note: note.trim() },
      { onConflict: "user_id,item_key" },
    );
  }

  revalidatePath("/playbook");
  return { ok: true };
}
