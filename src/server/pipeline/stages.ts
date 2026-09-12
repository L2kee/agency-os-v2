// The fixed pipeline for the "build local businesses a website" agency model.
// Customisable pipelines are a later phase — for now this list is the source
// of truth. Pure config, no Supabase import — safe to import from app/components.

export type StageId = "new" | "contacted" | "interested" | "proposal" | "won" | "lost";

export interface Stage {
  id: StageId;
  label: string;
  /** Tailwind classes for the column header accent. */
  accent: string;
  /** Won/lost columns are terminal and styled differently. */
  terminal?: boolean;
}

export const STAGES: Stage[] = [
  { id: "new", label: "New Lead", accent: "bg-slate-400" },
  { id: "contacted", label: "Contacted", accent: "bg-blue-400" },
  { id: "interested", label: "Interested", accent: "bg-violet-400" },
  { id: "proposal", label: "Proposal Sent", accent: "bg-amber-400" },
  { id: "won", label: "Won", accent: "bg-emerald-500", terminal: true },
  { id: "lost", label: "Lost", accent: "bg-rose-400", terminal: true },
];

export const STAGE_IDS = STAGES.map((s) => s.id) as StageId[];

export function stageLabel(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

export function isStageId(value: string): value is StageId {
  return STAGE_IDS.includes(value as StageId);
}
