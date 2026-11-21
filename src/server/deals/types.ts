import type { BillingInterval } from "@/lib/money";

export type DealStatus = "open" | "won" | "lost";

export interface Deal {
  id: string;
  organization_id: string;
  user_id: string;
  number: number;
  title: string;
  lead_id: string | null;
  customer_id: string | null;
  contact_id: string | null;
  status: DealStatus;
  expected_close_on: string | null;
  notes: string | null;
  one_time_total_cents: number;
  monthly_total_cents: number;
  yearly_total_cents: number;
  payment_url: string | null;
  stripe_payment_link_id: string | null;
  stripe_checkout_session_id: string | null;
  paid_at: string | null;
  paid_amount_cents: number | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealItem {
  id: string;
  deal_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  billing_interval: BillingInterval;
  position: number;
}

/** A deal with the names of who it's for, for lists and the deal page. */
export interface DealWithParties extends Deal {
  lead: { id: string; business_name: string } | null;
  customer: { id: string; name: string } | null;
  contact: { id: string; full_name: string; email: string | null; phone: string | null } | null;
}
