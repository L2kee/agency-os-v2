"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import type { ImportResult, Prospect, SearchResult } from "./types";

// Server Actions the Prospecting page's Client Component calls directly.
// Google Places is a paid external API — nobody outside src/server touches
// the fetch or the API key.

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.userRatingCount",
].join(",");

export async function searchPlaces(formData: FormData): Promise<SearchResult> {
  await requireUser();

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return {
      error:
        "GOOGLE_PLACES_API_KEY is not set. Add it to .env.local (see README) and restart the dev server.",
    };
  }

  const what = (formData.get("what") ?? "").toString().trim();
  const where = (formData.get("where") ?? "").toString().trim();
  const onlyNoWebsite = formData.get("only_no_website") === "on";
  if (!what || !where) return { error: "Enter what and where." };

  let res: Response;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: `${what} in ${where}`, pageSize: 20 }),
    });
  } catch {
    return { error: "Could not reach the Google Places API." };
  }

  if (!res.ok) {
    const detail = await res.text();
    return { error: `Places API error (${res.status}): ${detail.slice(0, 300)}` };
  }

  const json = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      websiteUri?: string;
      nationalPhoneNumber?: string;
      primaryTypeDisplayName?: { text: string };
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  let prospects: Prospect[] = (json.places ?? []).map((p) => ({
    place_id: p.id,
    business_name: p.displayName?.text ?? "Unknown",
    category: p.primaryTypeDisplayName?.text ?? null,
    address: p.formattedAddress ?? null,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    has_website: Boolean(p.websiteUri),
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? null,
  }));

  if (onlyNoWebsite) prospects = prospects.filter((p) => !p.has_website);

  return { prospects };
}

/**
 * Import selected prospects as leads. NOTE: this deliberately does NOT use
 * `.upsert(..., { onConflict: "user_id,place_id" })` — leads_user_place_idx
 * is a PARTIAL unique index (WHERE place_id IS NOT NULL), which Postgres/
 * PostgREST cannot use for ON CONFLICT inference (error 42P10), so every
 * import would silently insert zero rows. Instead: look up the place_ids
 * this user already has, filter them out, and plain-insert the rest.
 * (Same bug + fix as the original agency-os app's commit be9fd00.)
 */
export async function importProspects(prospects: Prospect[]): Promise<ImportResult> {
  const { supabase, user } = await requireUser();
  if (prospects.length === 0) return { imported: 0 };

  const placeIds = prospects.map((p) => p.place_id).filter(Boolean);
  const { data: existing } = await supabase
    .from("leads")
    .select("place_id")
    .eq("user_id", user.id)
    .in("place_id", placeIds);

  const alreadyHave = new Set((existing ?? []).map((r) => r.place_id));
  const fresh = prospects.filter((p) => !alreadyHave.has(p.place_id));
  const skipped = prospects.length - fresh.length;

  if (fresh.length === 0) return { imported: 0, skipped };

  const now = Date.now();
  const rows = fresh.map((p, i) => ({
    user_id: user.id,
    business_name: p.business_name,
    category: p.category,
    address: p.address,
    phone: p.phone,
    website: p.website,
    has_website: p.has_website,
    website_quality: p.has_website ? null : "none",
    place_id: p.place_id,
    source: "google_places",
    stage: "new",
    deal_value: 1000,
    sort_order: now + i,
  }));

  const { data, error } = await supabase.from("leads").insert(rows).select("id");
  if (error) return { error: error.message, imported: 0 };

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { imported: data?.length ?? 0, skipped };
}
