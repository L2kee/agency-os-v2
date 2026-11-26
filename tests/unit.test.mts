// Unit tests for the pure sales logic: money helpers, payment link lines,
// and the Stripe webhook decision. No network, no database.
//
// Usage: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import {
  centsToInput,
  dollarsToCents,
  firstYearCents,
  formatMoney,
  formatPrice,
  summarizeTotals,
} from "../src/lib/money";
import { buildPaymentLinkLines, handleStripeEvent } from "../src/server/payments/logic";
import { isClockSkewError, retryOnClockSkew } from "../src/server/auth/retry";

test("dollarsToCents reads what people type", () => {
  assert.equal(dollarsToCents("997"), 99700);
  assert.equal(dollarsToCents("$1,200.50"), 120050);
  assert.equal(dollarsToCents("49.9"), 4990);
  assert.equal(dollarsToCents(" 0 "), 0);
  assert.equal(dollarsToCents("12.345"), null);
  assert.equal(dollarsToCents("-5"), null);
  assert.equal(dollarsToCents("abc"), null);
  assert.equal(dollarsToCents(""), null);
});

test("money formats whole amounts without cents", () => {
  assert.equal(formatMoney(99700), "$997");
  assert.equal(formatMoney(1250), "$12.50");
  assert.equal(formatPrice(29700, "month"), "$297/mo");
  assert.equal(formatPrice(50000, "year"), "$500/yr");
  assert.equal(centsToInput(99700), "997");
  assert.equal(centsToInput(1250), "12.50");
});

test("deal totals read at a glance and give a first year value", () => {
  const totals = { oneTimeCents: 99700, monthlyCents: 29700, yearlyCents: 0 };
  assert.equal(summarizeTotals(totals), "$997 + $297/mo");
  assert.equal(summarizeTotals({ oneTimeCents: 0, monthlyCents: 0, yearlyCents: 0 }), "$0");
  assert.equal(firstYearCents(totals), 99700 + 12 * 29700);
});

test("payment link lines carry one time and recurring prices", () => {
  const result = buildPaymentLinkLines(
    [
      { name: "Setup", quantity: 1, unit_price_cents: 99700, billing_interval: null },
      { name: "Front desk", quantity: 1, unit_price_cents: 29700, billing_interval: "month" },
      { name: "Free consult", quantity: 1, unit_price_cents: 0, billing_interval: null },
    ],
    "usd",
  );
  assert.ok("lines" in result);
  assert.equal(result.recurring, true);
  assert.equal(result.lines.length, 2, "zero priced lines are left off");
  assert.deepEqual(result.lines[1], {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: 29700,
      product_data: { name: "Front desk" },
      recurring: { interval: "month" },
    },
  });
});

test("fractional quantities become one line at the line total", () => {
  const result = buildPaymentLinkLines(
    [{ name: "Labor", quantity: 1.5, unit_price_cents: 9000, billing_interval: null }],
    "usd",
  );
  assert.ok("lines" in result);
  assert.equal(result.recurring, false);
  assert.equal(result.lines[0].quantity, 1);
  assert.equal(result.lines[0].price_data?.unit_amount, 13500);
  assert.equal(result.lines[0].price_data?.product_data?.name, "Labor (x1.5)");
});

test("monthly and yearly lines can't share one checkout, and empty deals are refused", () => {
  const mixed = buildPaymentLinkLines(
    [
      { name: "A", quantity: 1, unit_price_cents: 100, billing_interval: "month" },
      { name: "B", quantity: 1, unit_price_cents: 100, billing_interval: "year" },
    ],
    "usd",
  );
  assert.ok("error" in mixed);
  const empty = buildPaymentLinkLines([], "usd");
  assert.ok("error" in empty);
});

function sessionEvent(type: string, session: Partial<Stripe.Checkout.Session>) {
  return {
    id: "evt_1",
    type,
    data: { object: { id: "cs_1", object: "checkout.session", ...session } },
  } as unknown as Stripe.Event;
}

function fakeDeps(dealForLink: string | null) {
  const calls: unknown[][] = [];
  return {
    calls,
    deps: {
      async findDealByPaymentLink(linkId: string) {
        return linkId === dealForLink ? { id: "deal_1" } : null;
      },
      async markDealWon(...args: [string, number | null, string]) {
        calls.push(args);
      },
    },
  };
}

test("a paid checkout on a deal's link marks the deal won with the amount", async () => {
  const { calls, deps } = fakeDeps("plink_1");
  const result = await handleStripeEvent(
    sessionEvent("checkout.session.completed", {
      payment_link: "plink_1",
      payment_status: "paid",
      amount_total: 129400,
    }),
    deps,
  );
  assert.equal(result, "deal deal_1 marked won");
  assert.deepEqual(calls, [["deal_1", 129400, "cs_1"]]);
});

test("unpaid, foreign, and unrelated events change nothing", async () => {
  const { calls, deps } = fakeDeps("plink_1");
  await handleStripeEvent(
    sessionEvent("checkout.session.completed", { payment_link: "plink_1", payment_status: "unpaid" }),
    deps,
  );
  await handleStripeEvent(
    sessionEvent("checkout.session.completed", { payment_link: "plink_site", payment_status: "paid" }),
    deps,
  );
  await handleStripeEvent(
    sessionEvent("checkout.session.completed", { payment_link: null, payment_status: "paid" }),
    deps,
  );
  await handleStripeEvent(sessionEvent("invoice.paid", {}), deps);
  assert.equal(calls.length, 0);
});

test("a delayed bank payment counts once it succeeds", async () => {
  const { calls, deps } = fakeDeps("plink_1");
  await handleStripeEvent(
    sessionEvent("checkout.session.async_payment_succeeded", {
      payment_link: "plink_1",
      payment_status: "paid",
      amount_total: 500,
    }),
    deps,
  );
  assert.equal(calls.length, 1);
});

test("the webhook signature check accepts a signed payload and rejects a tampered one", () => {
  const stripe = new Stripe("sk_test_placeholder");
  const secret = "whsec_test_placeholder";
  const payload = JSON.stringify(sessionEvent("checkout.session.completed", { payment_link: "plink_1" }));
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

  const event = stripe.webhooks.constructEvent(payload, header, secret);
  assert.equal(event.type, "checkout.session.completed");

  assert.throws(() => stripe.webhooks.constructEvent(payload.replace("plink_1", "plink_2"), header, secret));
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, "whsec_wrong"));
});

test("only the token clock skew error counts as clock skew", () => {
  assert.equal(isClockSkewError({ message: "JWT issued at future", code: "PGRST303" }), true);
  assert.equal(isClockSkewError({ message: "jwt Issued At Future" }), true);
  assert.equal(isClockSkewError({ message: "JWT expired", code: "PGRST303" }), false);
  assert.equal(isClockSkewError({ message: "permission denied for table leads" }), false);
  assert.equal(isClockSkewError(null), false);
  assert.equal(isClockSkewError(undefined), false);
});

test("a clock skew error is retried once and the second result wins", async () => {
  let calls = 0;
  const result = await retryOnClockSkew(
    async () => (++calls === 1 ? { error: { message: "JWT issued at future" } } : { error: null }),
    (r) => [r.error],
    0,
  );
  assert.equal(calls, 2);
  assert.equal(result.error, null);
});

test("clock skew on a second try is not retried again", async () => {
  let calls = 0;
  const result = await retryOnClockSkew(
    async () => {
      calls++;
      return { error: { message: "JWT issued at future" } };
    },
    (r) => [r.error],
    0,
  );
  assert.equal(calls, 2);
  assert.equal(result.error?.message, "JWT issued at future");
});

test("success and other errors come back from the first try untouched", async () => {
  for (const error of [null, { message: "permission denied" }, { message: "JWT expired" }]) {
    let calls = 0;
    const result = await retryOnClockSkew(
      async () => {
        calls++;
        return [{ error: null }, { error }];
      },
      ([a, b]) => [a.error, b.error],
      0,
    );
    assert.equal(calls, 1);
    assert.equal(result[1].error, error);
  }
});
