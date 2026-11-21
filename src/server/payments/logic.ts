// Pure Stripe logic for deals: turning deal lines into payment link line
// items, and deciding what a webhook event means. No network and no
// Supabase here, so it is unit tested directly (tests/unit.test.mts).

import type Stripe from "stripe";
import type { BillingInterval } from "@/lib/money";

export interface PayableItem {
  name: string;
  quantity: number;
  unit_price_cents: number;
  billing_interval: BillingInterval;
}

export type LineResult =
  | { lines: Stripe.PaymentLinkCreateParams.LineItem[]; recurring: boolean }
  | { error: string };

// Stripe caps a single payment link at 20 line items.
const MAX_LINES = 20;

/**
 * Builds payment link line items from a deal's lines. Stripe needs whole
 * quantities, so a line like 1.5 hours becomes quantity 1 at the line total
 * with the quantity in its name. One subscription can't mix monthly and
 * yearly prices, so that case is refused with a message for the user.
 */
export function buildPaymentLinkLines(items: PayableItem[], currency: string): LineResult {
  const billable = items.filter((item) => item.unit_price_cents > 0);
  if (billable.length === 0) {
    return { error: "Add at least one priced line before creating a payment link." };
  }
  if (billable.length > MAX_LINES) {
    return { error: `Stripe allows up to ${MAX_LINES} lines on one payment link.` };
  }

  const intervals = new Set(billable.map((item) => item.billing_interval).filter(Boolean));
  if (intervals.size > 1) {
    return {
      error: "Stripe can't charge monthly and yearly lines in one checkout. Split them into two deals.",
    };
  }

  const lines = billable.map((item) => {
    const whole = Number.isInteger(item.quantity);
    const unitAmount = whole
      ? item.unit_price_cents
      : Math.round(item.quantity * item.unit_price_cents);
    return {
      quantity: whole ? item.quantity : 1,
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: { name: whole ? item.name : `${item.name} (x${item.quantity})` },
        ...(item.billing_interval ? { recurring: { interval: item.billing_interval } } : {}),
      },
    };
  });

  return { lines, recurring: intervals.size === 1 };
}

export interface WebhookDeps {
  findDealByPaymentLink(paymentLinkId: string): Promise<{ id: string } | null>;
  markDealWon(dealId: string, paidCents: number | null, checkoutSessionId: string): Promise<void>;
}

/**
 * Acts on one verified Stripe event and says what happened, for the log.
 * This endpoint receives every event on the account, including the
 * website's own payment links, so anything that isn't a paid checkout on a
 * deal's payment link is ignored.
 */
export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<string> {
  const isCompleted = event.type === "checkout.session.completed";
  const isAsyncPaid = event.type === "checkout.session.async_payment_succeeded";
  if (!isCompleted && !isAsyncPaid) {
    return `ignored ${event.type}`;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  // A bank debit finishes later and arrives as async_payment_succeeded.
  if (isCompleted && session.payment_status === "unpaid") {
    return "waiting for a delayed payment";
  }

  const linkId =
    typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;
  if (!linkId) {
    return "ignored, not from a payment link";
  }

  const deal = await deps.findDealByPaymentLink(linkId);
  if (!deal) {
    return "ignored, payment link isn't on a deal";
  }

  await deps.markDealWon(deal.id, session.amount_total ?? null, session.id);
  return `deal ${deal.id} marked won`;
}
