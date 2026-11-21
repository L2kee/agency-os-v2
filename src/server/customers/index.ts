import "server-only";

import { requireUser } from "@/server/auth";
import type { Contact, Customer, CustomerListRow } from "./types";

// Read only queries for customers and contacts. Server Actions are in ./actions.ts.
// Embeds name their foreign key, because leads also links customers and
// contacts and PostgREST would otherwise call the relationship ambiguous.

interface ListQueryRow extends Customer {
  contacts: Pick<Contact, "full_name" | "email" | "phone" | "is_primary">[];
  deals: {
    status: string;
    one_time_total_cents: number;
    monthly_total_cents: number;
    yearly_total_cents: number;
  }[];
}

/** Every customer, newest first, optionally filtered by name. */
export async function listCustomers(search?: string): Promise<CustomerListRow[]> {
  const { supabase } = await requireUser();
  let query = supabase
    .from("customers")
    .select(
      "*, contacts!contacts_organization_id_customer_id_fkey (full_name, email, phone, is_primary), deals!deals_organization_id_customer_id_fkey (status, one_time_total_cents, monthly_total_cents, yearly_total_cents)",
    )
    .order("created_at", { ascending: false });
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ListQueryRow[]).map(({ contacts, deals, ...customer }) => {
    const won = deals.filter((deal) => deal.status === "won");
    const primary = contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null;
    return {
      ...customer,
      primaryContact: primary
        ? { full_name: primary.full_name, email: primary.email, phone: primary.phone }
        : null,
      wonOneTimeCents: won.reduce((sum, deal) => sum + Number(deal.one_time_total_cents), 0),
      wonMonthlyCents: won.reduce((sum, deal) => sum + Number(deal.monthly_total_cents), 0),
      wonYearlyCents: won.reduce((sum, deal) => sum + Number(deal.yearly_total_cents), 0),
    };
  });
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  return (data as Customer | null) ?? null;
}

export async function listContacts(customerId: string): Promise<Contact[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("created_at");
  return (data ?? []) as Contact[];
}

/** Customers and their contacts, for the "who is this deal for" pickers. */
export async function listCustomerOptions() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("customers")
    .select("id, name, contacts!contacts_organization_id_customer_id_fkey (id, full_name)")
    .eq("status", "active")
    .order("name");
  return (data ?? []) as { id: string; name: string; contacts: { id: string; full_name: string }[] }[];
}

export type { Customer, Contact, CustomerKind, CustomerListRow } from "./types";
export {
  saveCustomer,
  deleteCustomer,
  saveContact,
  deleteContact,
  convertLead,
} from "./actions";
