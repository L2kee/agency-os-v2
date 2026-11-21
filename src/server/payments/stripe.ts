import "server-only";

import Stripe from "stripe";
import type { OrgContext } from "@/server/access/types";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

let platformClient: Stripe | null = null;

/** The platform's (EVOGENCY's) Stripe client, or null when no key is set. */
export function getPlatformStripe() {
  if (!SECRET_KEY) {
    return null;
  }
  platformClient ??= new Stripe(SECRET_KEY);
  return platformClient;
}

export interface OrgStripe {
  client: Stripe;
  // Sent with every call so the money lands in the organization's own
  // connected account instead of the platform's.
  requestOptions: Stripe.RequestOptions;
}

/**
 * The Stripe client an organization's payments go through, or null when it
 * can't take payments yet. The platform organization uses the platform key
 * directly. Every other organization needs its own connected account
 * (Stripe Connect, Phase 5), so a customer's money never lands in
 * EVOGENCY's account by mistake.
 */
export function stripeForOrg(
  org: OrgContext,
  stripeAccountId: string | null,
): OrgStripe | null {
  const client = getPlatformStripe();
  if (!client) {
    return null;
  }
  if (stripeAccountId) {
    return { client, requestOptions: { stripeAccount: stripeAccountId } };
  }
  if (org.isPlatform) {
    return { client, requestOptions: {} };
  }
  return null;
}
