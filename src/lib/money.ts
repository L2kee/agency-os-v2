// Money helpers. Amounts are integer cents everywhere in the app and the
// database. Pure functions, safe to import from client and server code.

export type BillingInterval = "month" | "year" | null;

export interface Totals {
  oneTimeCents: number;
  monthlyCents: number;
  yearlyCents: number;
}

/** Formats cents as currency. Whole amounts drop the ".00" ($997, $12.50). */
export function formatMoney(cents: number, currency = "usd") {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** The short suffix shown after a recurring price. */
export function intervalSuffix(interval: BillingInterval) {
  if (interval === "month") {
    return "/mo";
  }
  if (interval === "year") {
    return "/yr";
  }
  return "";
}

/** A price with its interval, for example "$297/mo" or "$997". */
export function formatPrice(cents: number, interval: BillingInterval, currency = "usd") {
  return `${formatMoney(cents, currency)}${intervalSuffix(interval)}`;
}

/**
 * Parses what someone types in a price box ("997", "$1,200.50", "49.9")
 * into cents. Returns null for anything that isn't a non negative amount
 * with at most two decimals.
 */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const [dollars, fraction = ""] = cleaned.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents as a plain number for an input box ("997", "12.50"). */
export function centsToInput(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** First year value: one time charges plus a year of the recurring ones. */
export function firstYearCents(totals: Totals) {
  return totals.oneTimeCents + 12 * totals.monthlyCents + totals.yearlyCents;
}

/**
 * How a deal reads at a glance, for example "$997 + $297/mo". Parts that are
 * zero are left out, and an empty deal reads "$0".
 */
export function summarizeTotals(totals: Totals, currency = "usd") {
  const parts = [];
  if (totals.oneTimeCents > 0) {
    parts.push(formatMoney(totals.oneTimeCents, currency));
  }
  if (totals.monthlyCents > 0) {
    parts.push(formatPrice(totals.monthlyCents, "month", currency));
  }
  if (totals.yearlyCents > 0) {
    parts.push(formatPrice(totals.yearlyCents, "year", currency));
  }
  return parts.length > 0 ? parts.join(" + ") : formatMoney(0, currency);
}
