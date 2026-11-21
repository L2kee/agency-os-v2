"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";
import { dollarsToCents } from "@/lib/money";
import { buildPaymentLinkLines } from "@/server/payments/logic";
import { stripeForOrg } from "@/server/payments/stripe";
import { STAGES } from "@/server/pipeline/stages";
import type { OrgContext } from "@/server/access/types";
import type { DealItem } from "./types";

export type ActionResult = { ok?: true; error?: string; url?: string };

function text(value: FormDataEntryValue | null) {
  const trimmed = (value ?? "").toString().trim();
  return trimmed === "" ? null : trimmed;
}

function refresh(dealId: string, leadId?: string | null, customerId?: string | null) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/");
  if (leadId) {
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/pipeline");
  }
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function loadDeal(supabase: Supabase, dealId: string) {
  const { data } = await supabase
    .from("deals")
    .select("id, number, status, lead_id, customer_id, stripe_payment_link_id, payment_url")
    .eq("id", dealId)
    .maybeSingle();
  return data as {
    id: string;
    number: number;
    status: string;
    lead_id: string | null;
    customer_id: string | null;
    stripe_payment_link_id: string | null;
    payment_url: string | null;
  } | null;
}

// A payment link carries the prices it was made with. When the lines change,
// or the deal closes, the old link is switched off in Stripe and cleared, so
// nobody can pay a stale amount. The organization must be read through the
// signed in user first (the caller passes the row security checked deal).
async function retirePaymentLink(org: OrgContext, dealId: string, linkId: string | null) {
  if (!linkId) {
    return null;
  }
  if (!hasAdminClient) {
    return "SUPABASE_SERVICE_ROLE_KEY isn't set, so the old payment link can't be cleared.";
  }

  const admin = createAdminClient();
  const { data: orgRow } = await admin
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", org.id)
    .single();
  const stripe = stripeForOrg(org, orgRow?.stripe_account_id ?? null);
  if (stripe) {
    try {
      await stripe.client.paymentLinks.update(linkId, { active: false }, stripe.requestOptions);
    } catch (err) {
      console.error(`[deals] couldn't deactivate payment link ${linkId}`, err);
      return "Couldn't switch off the old payment link in Stripe. Try again.";
    }
  }

  const { error } = await admin
    .from("deals")
    .update({ payment_url: null, stripe_payment_link_id: null })
    .eq("id", dealId)
    .eq("organization_id", org.id);
  return error ? error.message : null;
}

async function editableDeal(supabase: Supabase, org: OrgContext, dealId: string) {
  const deal = await loadDeal(supabase, dealId);
  if (!deal) {
    return { error: "Deal not found." } as const;
  }
  if (deal.status !== "open") {
    return { error: "Reopen the deal to change its lines." } as const;
  }
  const retireError = await retirePaymentLink(org, deal.id, deal.stripe_payment_link_id);
  if (retireError) {
    return { error: retireError } as const;
  }
  return { deal } as const;
}

async function nextPosition(supabase: Supabase, dealId: string) {
  const { data } = await supabase
    .from("deal_items")
    .select("position")
    .eq("deal_id", dealId)
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? 0) + 1;
}

/**
 * Starts a deal for a lead or a customer and opens it. With a lead and no
 * title, the deal is named after the business. A lead still in the early
 * stages moves to Proposal Sent.
 */
export async function createDeal(formData: FormData) {
  const { supabase, user, org } = await requireUser();
  const leadId = text(formData.get("lead_id"));
  let customerId = text(formData.get("customer_id"));
  let title = text(formData.get("title"));
  let contactId = text(formData.get("contact_id"));
  let leadStage: string | null = null;

  if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("business_name, stage, customer_id, contact_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) {
      throw new Error("Lead not found");
    }
    title ??= lead.business_name;
    customerId ??= lead.customer_id;
    contactId ??= lead.contact_id;
    leadStage = lead.stage;
  }
  if (customerId && !title) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .maybeSingle();
    title = customer?.name ?? null;
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      title: title ?? "New deal",
      lead_id: leadId,
      customer_id: customerId,
      contact_id: contactId,
      expected_close_on: text(formData.get("expected_close_on")),
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }

  const proposalIndex = STAGES.findIndex((stage) => stage.id === "proposal");
  const leadIndex = STAGES.findIndex((stage) => stage.id === leadStage);
  if (leadId && leadIndex !== -1 && leadIndex < proposalIndex) {
    await supabase.from("leads").update({ stage: "proposal" }).eq("id", leadId);
  }

  refresh(data.id, leadId, customerId);
  redirect(`/deals/${data.id}`);
}

export async function updateDeal(dealId: string, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const title = text(formData.get("title"));
  if (!title) {
    return { error: "Give the deal a title." };
  }
  const { data, error } = await supabase
    .from("deals")
    .update({
      title,
      expected_close_on: text(formData.get("expected_close_on")),
      notes: text(formData.get("notes")),
    })
    .eq("id", dealId)
    .select("lead_id, customer_id")
    .single();
  if (error) {
    return { error: error.message };
  }
  refresh(dealId, data.lead_id, data.customer_id);
  return { ok: true };
}

/** One tap add from the catalog. Copies the item's name and price onto the deal. */
export async function addProductLine(dealId: string, productId: string): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();
  const checked = await editableDeal(supabase, org, dealId);
  if ("error" in checked) {
    return { error: checked.error };
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, unit_price_cents, billing_interval, is_active")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.is_active) {
    return { error: "That catalog item isn't available." };
  }

  const { error } = await supabase.from("deal_items").insert({
    organization_id: org.id,
    user_id: user.id,
    deal_id: dealId,
    product_id: product.id,
    name: product.name,
    description: product.description,
    unit_price_cents: product.unit_price_cents,
    billing_interval: product.billing_interval,
    position: await nextPosition(supabase, dealId),
  });
  if (error) {
    return { error: error.message };
  }
  refresh(dealId, checked.deal.lead_id, checked.deal.customer_id);
  return { ok: true };
}

/** A line that isn't in the catalog, like a one off discount or custom work. */
export async function addCustomLine(dealId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();
  const name = text(formData.get("name"));
  const price = dollarsToCents(text(formData.get("price")) ?? "");
  const quantity = Number(text(formData.get("quantity")) ?? "1");
  const interval = text(formData.get("billing_interval"));
  if (!name) {
    return { error: "Name the line." };
  }
  if (price === null) {
    return { error: "Enter the price as a number, like 250 or 49.50." };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be more than zero." };
  }

  const checked = await editableDeal(supabase, org, dealId);
  if ("error" in checked) {
    return { error: checked.error };
  }

  const { error } = await supabase.from("deal_items").insert({
    organization_id: org.id,
    user_id: user.id,
    deal_id: dealId,
    name,
    quantity,
    unit_price_cents: price,
    billing_interval: interval === "month" || interval === "year" ? interval : null,
    position: await nextPosition(supabase, dealId),
  });
  if (error) {
    return { error: error.message };
  }
  refresh(dealId, checked.deal.lead_id, checked.deal.customer_id);
  return { ok: true };
}

export async function updateLine(
  dealId: string,
  itemId: string,
  changes: Pick<DealItem, "quantity" | "unit_price_cents">,
): Promise<ActionResult> {
  const { supabase, org } = await requireUser();
  if (!Number.isFinite(changes.quantity) || changes.quantity <= 0) {
    return { error: "Quantity must be more than zero." };
  }
  if (!Number.isSafeInteger(changes.unit_price_cents) || changes.unit_price_cents < 0) {
    return { error: "Enter a valid price." };
  }

  const checked = await editableDeal(supabase, org, dealId);
  if ("error" in checked) {
    return { error: checked.error };
  }

  const { error } = await supabase
    .from("deal_items")
    .update({ quantity: changes.quantity, unit_price_cents: changes.unit_price_cents })
    .eq("id", itemId)
    .eq("deal_id", dealId);
  if (error) {
    return { error: error.message };
  }
  refresh(dealId, checked.deal.lead_id, checked.deal.customer_id);
  return { ok: true };
}

export async function removeLine(dealId: string, itemId: string): Promise<ActionResult> {
  const { supabase, org } = await requireUser();
  const checked = await editableDeal(supabase, org, dealId);
  if ("error" in checked) {
    return { error: checked.error };
  }
  const { error } = await supabase.from("deal_items").delete().eq("id", itemId).eq("deal_id", dealId);
  if (error) {
    return { error: error.message };
  }
  refresh(dealId, checked.deal.lead_id, checked.deal.customer_id);
  return { ok: true };
}

/** Won by hand (paid another way). Converts the lead into a customer. */
export async function markDealWon(dealId: string): Promise<ActionResult> {
  const { supabase, org } = await requireUser();
  const deal = await loadDeal(supabase, dealId);
  if (!deal) {
    return { error: "Deal not found." };
  }
  const retireError = await retirePaymentLink(org, deal.id, deal.stripe_payment_link_id);
  if (retireError) {
    return { error: retireError };
  }
  const { error } = await supabase.rpc("mark_deal_won", { p_deal: dealId });
  if (error) {
    return { error: error.message };
  }
  const { data } = await supabase.from("deals").select("customer_id").eq("id", dealId).single();
  refresh(dealId, deal.lead_id, data?.customer_id);
  revalidatePath("/customers");
  return { ok: true };
}

export async function markDealLost(dealId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();
  const deal = await loadDeal(supabase, dealId);
  if (!deal) {
    return { error: "Deal not found." };
  }
  if (deal.status !== "open") {
    return { error: "Only an open deal can be marked lost." };
  }
  const retireError = await retirePaymentLink(org, deal.id, deal.stripe_payment_link_id);
  if (retireError) {
    return { error: retireError };
  }

  const reason = text(formData.get("lost_reason"));
  const { error } = await supabase
    .from("deals")
    .update({ status: "lost", lost_at: new Date().toISOString(), lost_reason: reason })
    .eq("id", dealId);
  if (error) {
    return { error: error.message };
  }
  if (deal.lead_id) {
    await supabase.from("activities").insert({
      organization_id: org.id,
      user_id: user.id,
      lead_id: deal.lead_id,
      type: "deal",
      body: `Deal #${deal.number} lost${reason ? `, ${reason}` : ""}`,
    });
  }
  refresh(dealId, deal.lead_id, deal.customer_id);
  return { ok: true };
}

/** Puts a lost deal back to open. A won deal stays won (its customer exists). */
export async function reopenDeal(dealId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("deals")
    .update({ status: "open", lost_at: null, lost_reason: null })
    .eq("id", dealId)
    .eq("status", "lost")
    .select("lead_id, customer_id");
  if (error) {
    return { error: error.message };
  }
  if (!data?.length) {
    return { error: "Only a lost deal can be reopened." };
  }
  refresh(dealId, data[0].lead_id, data[0].customer_id);
  return { ok: true };
}

export async function deleteDeal(dealId: string) {
  const { supabase, org } = await requireUser();
  const deal = await loadDeal(supabase, dealId);
  if (!deal) {
    redirect("/deals");
  }
  const retireError = await retirePaymentLink(org, deal.id, deal.stripe_payment_link_id);
  if (retireError) {
    throw new Error(retireError);
  }
  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) {
    throw new Error(error.message);
  }
  refresh(dealId, deal.lead_id, deal.customer_id);
  redirect("/deals");
}

/**
 * Creates a single use Stripe payment link for the deal's lines and saves
 * it on the deal. Paying it fires the webhook, which marks the deal won.
 * Changing a line later switches this link off (see retirePaymentLink).
 */
export async function createPaymentLink(dealId: string): Promise<ActionResult> {
  const { supabase, user, org } = await requireUser();
  const deal = await loadDeal(supabase, dealId);
  if (!deal) {
    return { error: "Deal not found." };
  }
  if (deal.status !== "open") {
    return { error: "Only an open deal can take a payment." };
  }
  if (deal.payment_url) {
    return { ok: true, url: deal.payment_url };
  }
  if (!hasAdminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." };
  }

  const { data: items } = await supabase
    .from("deal_items")
    .select("name, quantity, unit_price_cents, billing_interval")
    .eq("deal_id", dealId)
    .order("position");
  const built = buildPaymentLinkLines(
    (items ?? []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      unit_price_cents: Number(item.unit_price_cents),
      billing_interval: item.billing_interval,
    })),
    org.currency,
  );
  if ("error" in built) {
    return { error: built.error };
  }

  const admin = createAdminClient();
  const { data: orgRow } = await admin
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", org.id)
    .single();
  const stripe = stripeForOrg(org, orgRow?.stripe_account_id ?? null);
  if (!stripe) {
    return {
      error: org.isPlatform
        ? "STRIPE_SECRET_KEY isn't set on the server."
        : `Payments aren't connected for ${org.name} yet.`,
    };
  }

  const metadata = { deal_id: deal.id, organization_id: org.id };
  let link;
  try {
    link = await stripe.client.paymentLinks.create(
      {
        line_items: built.lines,
        metadata,
        restrictions: { completed_sessions: { limit: 1 } },
        after_completion: {
          type: "hosted_confirmation",
          hosted_confirmation: { custom_message: `Thank you! ${org.name} has your payment.` },
        },
        ...(built.recurring
          ? { subscription_data: { metadata } }
          : { payment_intent_data: { metadata } }),
      },
      stripe.requestOptions,
    );
  } catch (err) {
    console.error(`[deals] payment link for ${deal.id} failed`, err);
    return { error: err instanceof Error ? err.message : "Stripe refused the payment link." };
  }

  const { error } = await admin
    .from("deals")
    .update({ payment_url: link.url, stripe_payment_link_id: link.id })
    .eq("id", deal.id)
    .eq("organization_id", org.id);
  if (error) {
    return { error: error.message };
  }

  if (deal.lead_id) {
    await supabase.from("activities").insert({
      organization_id: org.id,
      user_id: user.id,
      lead_id: deal.lead_id,
      type: "deal",
      body: `Payment link created for Deal #${deal.number}`,
    });
  }

  refresh(deal.id, deal.lead_id, deal.customer_id);
  return { ok: true, url: link.url };
}
