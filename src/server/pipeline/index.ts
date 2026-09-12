import "server-only";

import { requireUser } from "@/server/auth";
import type { Lead } from "@/server/leads/types";

export type { StageId, Stage } from "./stages";
export { STAGES, STAGE_IDS, stageLabel, isStageId } from "./stages";
export { moveLeadToStage } from "./actions";

/** All leads for the board, grouped client-side by the caller. */
export async function getBoardLeads(): Promise<Lead[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}
