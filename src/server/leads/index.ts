import "server-only";

import { requireUser } from "@/server/auth";
import { STAGES } from "@/server/pipeline/stages";
import type { Activity, ActivityType, Lead } from "./types";

// Read-only queries + internal (server-to-server) writes. No "use server"
// directives in this file — Server Actions callable from Client Components
// live in ./actions.ts. Keeping them apart is required: a file that mixes
// plain server-only functions with per-function "use server" exports gets
// fully bundled (and then rejected by the "server-only" guard) the moment a
// Client Component imports anything from it.

/** All leads for the signed-in user, optionally filtered by business name. */
export async function listLeads(search?: string): Promise<Lead[]> {
  const { supabase } = await requireUser();
  let query = supabase.from("leads").select("*").order("updated_at", { ascending: false });
  if (search) query = query.ilike("business_name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

export async function getLead(id: string): Promise<Lead | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("leads").select("*").eq("id", id).single();
  return (data as Lead) ?? null;
}

export async function listActivities(leadId: string): Promise<Activity[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Activity[];
}

/** Insert an activity from another domain (e.g. call logging, email send). */
export async function logActivity(params: {
  leadId: string;
  type: ActivityType;
  body: string;
}) {
  const { supabase, user } = await requireUser();
  await supabase.from("activities").insert({
    user_id: user.id,
    lead_id: params.leadId,
    type: params.type,
    body: params.body,
  });
}

export interface DashboardStats {
  openCount: number;
  pipelineValue: number;
  wonCount: number;
  wonValue: number;
  byStage: { id: string; label: string; accent: string; count: number }[];
  recentlyUpdated: Pick<Lead, "id" | "business_name" | "stage" | "deal_value" | "updated_at">[];
  totalLeads: number;
}

/** Pipeline value, deals won, stage breakdown, and recently-updated leads. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("leads")
    .select("id, business_name, stage, deal_value, updated_at")
    .order("updated_at", { ascending: false });

  const leads = (data ?? []) as Pick<
    Lead,
    "id" | "business_name" | "stage" | "deal_value" | "updated_at"
  >[];

  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const won = leads.filter((l) => l.stage === "won");

  return {
    openCount: open.length,
    pipelineValue: open.reduce((s, l) => s + (l.deal_value ?? 0), 0),
    wonCount: won.length,
    wonValue: won.reduce((s, l) => s + (l.deal_value ?? 0), 0),
    byStage: STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      accent: s.accent,
      count: leads.filter((l) => l.stage === s.id).length,
    })),
    recentlyUpdated: leads.slice(0, 8),
    totalLeads: leads.length,
  };
}

// Re-export the Server Actions here too, so Server Components can do
// `import { createLead, listLeads } from "@/server/leads"` uniformly. Client
// Components must import actions directly from "@/server/leads/actions" —
// see the comment above.
export { createLead, updateLead, deleteLead, addActivity } from "./actions";
