import "server-only";

import { requireUser } from "@/server/auth";
import type { Totals } from "@/lib/money";
import type { DealItem, DealStatus, DealWithParties } from "./types";

// Read only queries for deals. Server Actions are in ./actions.ts.

// PostgREST can't guess which foreign key to follow when two tables are
// linked more than once (leads and customers point at each other), so each
// embed names its key.
const PARTIES =
  "*, lead:leads!deals_organization_id_lead_id_fkey (id, business_name), customer:customers!deals_organization_id_customer_id_fkey (id, name), contact:contacts!deals_organization_id_contact_id_fkey (id, full_name, email, phone)";

function normalize(row: DealWithParties): DealWithParties {
  return {
    ...row,
    one_time_total_cents: Number(row.one_time_total_cents),
    monthly_total_cents: Number(row.monthly_total_cents),
    yearly_total_cents: Number(row.yearly_total_cents),
    paid_amount_cents: row.paid_amount_cents === null ? null : Number(row.paid_amount_cents),
  };
}

export async function listDeals(status?: DealStatus): Promise<DealWithParties[]> {
  const { supabase } = await requireUser();
  let query = supabase.from("deals").select(PARTIES).order("updated_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as DealWithParties[]).map(normalize);
}

export async function getDeal(id: string): Promise<DealWithParties | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("deals").select(PARTIES).eq("id", id).maybeSingle();
  return data ? normalize(data as DealWithParties) : null;
}

export async function listDealItems(dealId: string): Promise<DealItem[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("deal_items")
    .select("id, deal_id, product_id, name, description, quantity, unit_price_cents, billing_interval, position")
    .eq("deal_id", dealId)
    .order("position")
    .order("created_at");
  return ((data ?? []) as DealItem[]).map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price_cents: Number(item.unit_price_cents),
  }));
}

export async function listDealsFor(filter: { leadId?: string; customerId?: string }) {
  const { supabase } = await requireUser();
  let query = supabase.from("deals").select(PARTIES).order("created_at", { ascending: false });
  if (filter.leadId) {
    query = query.eq("lead_id", filter.leadId);
  }
  if (filter.customerId) {
    query = query.eq("customer_id", filter.customerId);
  }
  const { data } = await query;
  return ((data ?? []) as DealWithParties[]).map(normalize);
}

export function dealTotals(deal: DealWithParties): Totals {
  return {
    oneTimeCents: deal.one_time_total_cents,
    monthlyCents: deal.monthly_total_cents,
    yearlyCents: deal.yearly_total_cents,
  };
}

export interface SalesStats {
  openCount: number;
  open: Totals;
  wonCount: number;
  won: Totals;
}

/** Open and won money across every deal, for the dashboard. */
export async function getSalesStats(): Promise<SalesStats> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("deals")
    .select("status, one_time_total_cents, monthly_total_cents, yearly_total_cents");

  const rows = (data ?? []) as {
    status: DealStatus;
    one_time_total_cents: number;
    monthly_total_cents: number;
    yearly_total_cents: number;
  }[];

  function sum(status: DealStatus): Totals {
    const matching = rows.filter((row) => row.status === status);
    return {
      oneTimeCents: matching.reduce((total, row) => total + Number(row.one_time_total_cents), 0),
      monthlyCents: matching.reduce((total, row) => total + Number(row.monthly_total_cents), 0),
      yearlyCents: matching.reduce((total, row) => total + Number(row.yearly_total_cents), 0),
    };
  }

  return {
    openCount: rows.filter((row) => row.status === "open").length,
    open: sum("open"),
    wonCount: rows.filter((row) => row.status === "won").length,
    won: sum("won"),
  };
}

export type { Deal, DealItem, DealStatus, DealWithParties } from "./types";
export {
  createDeal,
  updateDeal,
  addProductLine,
  addCustomLine,
  updateLine,
  removeLine,
  markDealWon,
  markDealLost,
  reopenDeal,
  deleteDeal,
  createPaymentLink,
} from "./actions";
