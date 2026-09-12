import type { StageId } from "@/server/pipeline/stages";

export interface Lead {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  source: string;
  place_id: string | null;
  stage: StageId;
  deal_value: number | null;
  sort_order: number;
  has_website: boolean | null;
  website_quality: "none" | "outdated" | "ok" | null;
  notes: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType = "note" | "call" | "email" | "meeting" | "stage_change";

export interface Activity {
  id: string;
  user_id: string;
  lead_id: string;
  type: ActivityType;
  body: string;
  created_at: string;
}

/** Fields the lead create/edit form can set. */
export interface LeadInput {
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  notes: string | null;
  deal_value: number | null;
}
