"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";

export type ActionResult = { ok?: true; error?: string };

function text(value: FormDataEntryValue | null) {
  const trimmed = (value ?? "").toString().trim();
  return trimmed === "" ? null : trimmed;
}

function customerFields(formData: FormData) {
  return {
    kind: text(formData.get("kind")) === "person" ? "person" : "business",
    name: text(formData.get("name")) ?? "",
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    website: text(formData.get("website")),
    address_line1: text(formData.get("address_line1")),
    address_line2: text(formData.get("address_line2")),
    city: text(formData.get("city")),
    state: text(formData.get("state")),
    postal_code: text(formData.get("postal_code")),
    notes: text(formData.get("notes")),
    status: text(formData.get("status")) === "former" ? "former" : "active",
  };
}

/**
 * Creates a customer (then opens its page) or updates one when the form
 * carries an id. A new person customer gets themselves as the first contact,
 * so a homeowner is one step, not two.
 */
export async function saveCustomer(formData: FormData): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();
  const id = text(formData.get("id"));
  const fields = customerFields(formData);
  if (!fields.name) {
    return { error: "Give the customer a name." };
  }

  if (id) {
    const { error } = await supabase.from("customers").update(fields).eq("id", id);
    if (error) {
      return { error: error.message };
    }
    revalidatePath(`/customers/${id}`);
    revalidatePath("/customers");
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...fields, organization_id: org.id, user_id: user.id })
    .select("id")
    .single();
  if (error) {
    return { error: error.message };
  }

  if (fields.kind === "person") {
    await supabase.from("contacts").insert({
      organization_id: org.id,
      user_id: user.id,
      customer_id: data.id,
      full_name: fields.name,
      email: fields.email,
      phone: fields.phone,
      is_primary: true,
    });
  }

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/customers");
  redirect("/customers");
}

/** Adds a contact to a customer, or updates one when the form carries an id. */
export async function saveContact(customerId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();
  const id = text(formData.get("id"));
  const fields = {
    full_name: text(formData.get("full_name")) ?? "",
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    title: text(formData.get("title")),
    is_primary: formData.get("is_primary") === "on",
  };
  if (!fields.full_name) {
    return { error: "Give the contact a name." };
  }

  // One primary contact per customer.
  if (fields.is_primary) {
    await supabase.from("contacts").update({ is_primary: false }).eq("customer_id", customerId);
  }

  const { error } = id
    ? await supabase.from("contacts").update(fields).eq("id", id).eq("customer_id", customerId)
    : await supabase.from("contacts").insert({
        ...fields,
        organization_id: org.id,
        user_id: user.id,
        customer_id: customerId,
      });
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}

export async function deleteContact(customerId: string, contactId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("customer_id", customerId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}

/** Turns a lead into a customer (and contact) by hand, then opens the customer. */
export async function convertLead(leadId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("convert_lead", { p_lead: leadId });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/customers");
  redirect(`/customers/${data as string}`);
}
