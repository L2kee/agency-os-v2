import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";
import { getPlatformStripe, STRIPE_WEBHOOK_SECRET } from "@/server/payments/stripe";
import { handleStripeEvent } from "@/server/payments/logic";

// Stripe calls this when a deal's payment link is paid. Public (see
// PUBLIC_PATHS in src/server/supabase/proxy.ts) and trusted only after the
// signature check. Live URL is /agency-os/api/stripe/webhook because of the
// basePath. Events from connected accounts (Phase 5) need their own endpoint
// secret and aren't handled yet.
export async function POST(request: Request) {
  const stripe = getPlatformStripe();
  if (!stripe || !STRIPE_WEBHOOK_SECRET || !hasAdminClient) {
    console.error("[stripe webhook] not configured");
    return new Response("Not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const payload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (seen) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    const result = await handleStripeEvent(event, {
      async findDealByPaymentLink(paymentLinkId) {
        const { data, error } = await admin
          .from("deals")
          .select("id")
          .eq("stripe_payment_link_id", paymentLinkId)
          .maybeSingle();
        if (error) {
          throw new Error(error.message);
        }
        return data;
      },
      async markDealWon(dealId, paidCents, checkoutSessionId) {
        const { error } = await admin.rpc("mark_deal_won", {
          p_deal: dealId,
          p_paid_cents: paidCents,
          p_checkout_session: checkoutSessionId,
        });
        if (error) {
          throw new Error(error.message);
        }
      },
    });
    console.log(`[stripe webhook] ${event.id} ${result}`);
  } catch (err) {
    // A 500 makes Stripe retry, and mark_deal_won is safe to run twice.
    console.error(`[stripe webhook] ${event.id} failed`, err);
    return new Response("Handler failed", { status: 500 });
  }

  await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  return Response.json({ received: true });
}
