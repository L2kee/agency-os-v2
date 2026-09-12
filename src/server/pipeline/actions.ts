"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { isStageId, stageLabel, type StageId } from "./stages";

/**
 * Move a lead to a new stage (drag-and-drop or the detail-page dropdown).
 * Logs a stage_change activity automatically. Client Components import this
 * directly from "@/server/pipeline/actions" (not the domain barrel).
 */
export async function moveLeadToStage(id: string, stage: StageId, sortOrder?: number) {
  const { supabase, user } = await requireUser();
  if (!isStageId(stage)) throw new Error("Unknown stage");

  const patch: Record<string, unknown> = { stage };
  if (typeof sortOrder === "number") patch.sort_order = sortOrder;

  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("activities").insert({
    user_id: user.id,
    lead_id: id,
    type: "stage_change",
    body: `Moved to ${stageLabel(stage)}`,
  });

  // A won or lost deal shouldn't keep receiving follow-up sequence emails.
  if (stage === "won" || stage === "lost") {
    await supabase
      .from("sequence_enrollments")
      .update({ status: "stopped", next_run_at: null })
      .eq("lead_id", id)
      .eq("status", "active");
  }

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/outreach");
  revalidatePath("/");
}
