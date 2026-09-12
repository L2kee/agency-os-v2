import "server-only";

import { requireUser } from "@/server/auth";
import type { Lead } from "@/server/leads/types";
import type { CallLog } from "./types";

// Read-only queries. Server Actions live in ./actions.ts (see the comment in
// src/server/leads/index.ts for why plain functions and "use server" exports
// can't share a file).

export async function listCallLogsForLead(leadId: string): Promise<CallLog[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("call_logs")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CallLog[];
}

export async function listPlaybookNotes(): Promise<Record<string, string>> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("playbook_notes").select("item_key, note");
  const notes: Record<string, string> = {};
  for (const n of (data ?? []) as { item_key: string; note: string }[]) {
    notes[n.item_key] = n.note;
  }
  return notes;
}

export type FollowUpDue = Pick<Lead, "id" | "business_name" | "phone" | "stage" | "next_follow_up_at">;

/** Leads with a follow-up date in the past that aren't already won/lost — dashboard "Follow-ups due". */
export async function getFollowUpsDue(): Promise<FollowUpDue[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("leads")
    .select("id, business_name, phone, stage, next_follow_up_at")
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", new Date().toISOString())
    .not("stage", "in", "(won,lost)")
    .order("next_follow_up_at", { ascending: true });
  return (data ?? []) as FollowUpDue[];
}

// Re-exported so Server Components can do
// `import { logCallOutcome, getFollowUpsDue } from "@/server/calling"` uniformly.
// Client Components must import actions directly from "@/server/calling/actions".
export { logCallOutcome, clearFollowUp, savePlaybookNote } from "./actions";
