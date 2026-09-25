"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import type { ActivityType, LeadInput } from "./types";

// Server Actions — the only functions in the leads domain that a Client
// Component (or a <form action={...}>) may call directly. Everything here is
// a thin wrapper: parse the form, do the write, revalidate, redirect.

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function leadInputFromForm(formData: FormData): LeadInput {
  const dealRaw = str(formData.get("deal_value"));
  return {
    business_name: str(formData.get("business_name")) ?? "",
    contact_name: str(formData.get("contact_name")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    website: str(formData.get("website")),
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    category: str(formData.get("category")),
    notes: str(formData.get("notes")),
    deal_value: dealRaw ? Number(dealRaw) : null,
  };
}

export async function createLead(formData: FormData) {
  const { supabase, user } = await requireUser();
  const input = leadInputFromForm(formData);
  if (!input.business_name) throw new Error("Business name is required");

  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: user.id,
      ...input,
      deal_value: input.deal_value ?? 1000,
      stage: "new",
      source: "manual",
      sort_order: Date.now(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const input = leadInputFromForm(formData);

  const { error } = await supabase
    .from("leads")
    .update({ ...input, business_name: input.business_name || "Untitled" })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
}

export async function deleteLead(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect("/leads");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK_DELETE = 500;

// Bulk delete from the Leads table. RLS scopes the delete to the caller's own
// leads, so foreign ids are silently skipped; `deleted` reports what actually went.
export async function deleteLeads(ids: string[]): Promise<{ deleted?: number; error?: string }> {
  const { supabase } = await requireUser();
  const clean = [...new Set(ids)].filter((id) => UUID_RE.test(id));
  if (clean.length === 0) return { error: "No leads selected." };
  if (clean.length > MAX_BULK_DELETE) return { error: `You can delete up to ${MAX_BULK_DELETE} leads at once.` };

  const { data, error } = await supabase.from("leads").delete().in("id", clean).select("id");
  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { deleted: data?.length ?? 0 };
}

export async function addActivity(leadId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const body = str(formData.get("body"));
  const type = (str(formData.get("type")) ?? "note") as ActivityType;
  if (!body) return;

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    lead_id: leadId,
    type,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/leads/${leadId}`);
}
