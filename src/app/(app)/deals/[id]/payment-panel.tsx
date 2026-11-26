"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Check, Copy, ExternalLink } from "lucide-react";
import { createPaymentLink, markDealLost, markDealWon, reopenDeal } from "@/server/deals/actions";
import type { DealStatus } from "@/server/deals/types";
import { formatMoney } from "@/lib/money";
import { BUTTON, BUTTON_QUIET, CARD, INPUT, LABEL, TAP } from "@/components/ui";

const day = (value: string) => format(new Date(value), "MMM d, yyyy");

export function PaymentPanel({
  dealId,
  status,
  paymentUrl,
  paidAt,
  paidAmountCents,
  wonAt,
  lostAt,
  lostReason,
  hasLines,
  totalLabel,
  currency,
}: {
  dealId: string;
  status: DealStatus;
  paymentUrl: string | null;
  paidAt: string | null;
  paidAmountCents: number | null;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  hasLines: boolean;
  totalLabel: string;
  currency: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [losing, setLosing] = useState(false);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      after?.();
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  if (status === "won") {
    return (
      <section className={CARD}>
        <h2 className="font-semibold text-emerald-700">Won</h2>
        <p className="mt-1 text-sm text-slate-600">
          {wonAt ? `Closed ${day(wonAt)}.` : "Closed."}{" "}
          {paidAt && paidAmountCents !== null
            ? `Paid ${formatMoney(paidAmountCents, currency)} through Stripe on ${day(paidAt)}.`
            : "Marked won by hand."}
        </p>
      </section>
    );
  }

  if (status === "lost") {
    return (
      <section className={CARD}>
        <h2 className="font-semibold text-rose-700">Lost</h2>
        <p className="mt-1 text-sm text-slate-600">
          {lostAt ? `Closed ${day(lostAt)}` : "Closed"}
          {lostReason ? `, ${lostReason}.` : "."}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => reopenDeal(dealId))}
          className={`${BUTTON_QUIET} mt-4`}
        >
          Reopen deal
        </button>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </section>
    );
  }

  return (
    <section className={CARD} aria-busy={pending}>
      <h2 className="font-semibold">Get paid</h2>

      {paymentUrl ? (
        <div className="mt-3 space-y-3">
          <label className={LABEL}>
            Payment link
            <input readOnly value={paymentUrl} onFocus={(event) => event.target.select()} className={INPUT} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(paymentUrl)} className={BUTTON}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={paymentUrl} target="_blank" rel="noreferrer" className={BUTTON_QUIET}>
              <ExternalLink size={16} aria-hidden="true" />
              Open
            </a>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            When they pay, this deal closes as won and the lead becomes a customer. Changing an item
            switches this link off, so nobody pays an old price.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            disabled={pending || !hasLines}
            onClick={() => run(() => createPaymentLink(dealId))}
            className={`${BUTTON} w-full`}
          >
            {pending ? "Creating…" : `Create payment link · ${totalLabel}`}
          </button>
          {!hasLines && <p className="mt-2 text-xs text-slate-500">Add a priced item first.</p>}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        {losing ? (
          <form action={(formData) => run(() => markDealLost(dealId, formData), () => setLosing(false))} className="space-y-3">
            <label className={LABEL}>
              Why was it lost? (optional)
              <input name="lost_reason" placeholder="Went with a cheaper option" className={INPUT} />
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={pending} className={BUTTON}>
                Mark lost
              </button>
              <button type="button" onClick={() => setLosing(false)} className={BUTTON_QUIET}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markDealWon(dealId))}
              className={`${TAP} text-slate-600 underline hover:text-slate-900`}
            >
              Paid another way? Mark won
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setLosing(true)}
              className={`${TAP} text-slate-600 underline hover:text-slate-900`}
            >
              Mark lost
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  );
}
