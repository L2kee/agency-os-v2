"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { dollarsToCents } from "@/lib/money";

export type ActionResult = { ok?: true; error?: string };

function text(value: FormDataEntryValue | null) {
  const trimmed = (value ?? "").toString().trim();
  return trimmed === "" ? null : trimmed;
}

/** Creates a catalog item, or updates it when the form carries an id. */
export async function saveProduct(formData: FormData): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();

  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  if (!name) {
    return { error: "Give it a name." };
  }

  const price = dollarsToCents(text(formData.get("price")) ?? "0");
  if (price === null) {
    return { error: "Enter the price as a number, like 997 or 49.50." };
  }

  const interval = text(formData.get("billing_interval"));
  const kind = text(formData.get("kind"));
  const fields = {
    name,
    description: text(formData.get("description")),
    kind: kind === "product" ? "product" : "service",
    category: text(formData.get("category")),
    sku: text(formData.get("sku")),
    unit: text(formData.get("unit")) ?? "each",
    unit_price_cents: price,
    billing_interval: interval === "month" || interval === "year" ? interval : null,
  };

  const { error } = id
    ? await supabase.from("products").update(fields).eq("id", id)
    : await supabase
        .from("products")
        .insert({ ...fields, organization_id: org.id, user_id: user.id });

  if (error) {
    return {
      error: error.code === "23505" ? "Another item already uses that SKU." : error.message,
    };
  }

  revalidatePath("/catalog");
  return { ok: true };
}

/** Archived items stay on old deals but can't be added to new ones. */
export async function setProductActive(id: string, isActive: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/catalog");
  return { ok: true };
}

/** Deleting is safe for old deals: their lines keep a copy of the name and price. */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/catalog");
  return { ok: true };
}
