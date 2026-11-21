import "server-only";

import { requireUser } from "@/server/auth";
import type { Product } from "./types";

// Read only queries for the catalog. Server Actions live in ./actions.ts
// (see the note at the top of src/server/leads/index.ts for why).

/** The organization's catalog, active items first, in display order. */
export async function listProducts(options: { activeOnly?: boolean } = {}): Promise<Product[]> {
  const { supabase } = await requireUser();
  let query = supabase
    .from("products")
    .select("*")
    .order("is_active", { ascending: false })
    .order("category", { ascending: true, nullsFirst: false })
    .order("position")
    .order("name");
  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return (data as Product | null) ?? null;
}

export type { Product, ProductKind } from "./types";
export { saveProduct, setProductActive, deleteProduct } from "./actions";
