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
