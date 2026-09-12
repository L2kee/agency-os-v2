import type { Lead } from "@/server/leads/types";

// Pure — no Supabase import, safe to import from Client Components
// (merge-hint.tsx, the sequence step editor, the email panel).

/** Merge fields available in templates and sequence steps. */
export const MERGE_FIELDS = [
  "business_name",
  "contact_name",
  "first_name",
  "city",
  "state",
  "category",
  "website",
  "sender_name",
] as const;

export function mergeValues(lead: Lead, senderName: string): Record<string, string> {
  const first = (lead.contact_name ?? "").trim().split(/\s+/)[0] ?? "";
  return {
    business_name: lead.business_name ?? "",
    contact_name: lead.contact_name ?? "",
    first_name: first || "there",
    city: lead.city ?? "",
    state: lead.state ?? "",
    category: (lead.category ?? "business").toLowerCase(),
    website: lead.website ?? "",
    sender_name: senderName,
  };
}

/** Replace {{field}} tokens. Unknown tokens are left as-is so mistakes are visible. */
export function renderMerge(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) =>
    key in values ? values[key] : whole,
  );
}

/** Names of merge tokens used in a string that we don't know how to fill. */
export function unknownTokens(text: string): string[] {
  const known = new Set<string>(MERGE_FIELDS);
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    if (!known.has(m[1])) found.add(m[1]);
  }
  return [...found];
}
