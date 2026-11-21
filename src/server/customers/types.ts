export type CustomerKind = "business" | "person";

export interface Customer {
  id: string;
  organization_id: string;
  user_id: string;
  kind: CustomerKind;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: "active" | "former";
  notes: string | null;
  source_lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  user_id: string;
  customer_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A customer row on the list page, with its primary contact and money won. */
export interface CustomerListRow extends Customer {
  primaryContact: Pick<Contact, "full_name" | "email" | "phone"> | null;
  wonOneTimeCents: number;
  wonMonthlyCents: number;
  wonYearlyCents: number;
}
