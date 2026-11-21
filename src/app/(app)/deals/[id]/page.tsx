import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/server/auth";
import { dealTotals, getDeal, listDealItems } from "@/server/deals";
import { listProducts } from "@/server/catalog";
import { firstYearCents, formatMoney, summarizeTotals } from "@/lib/money";
import { pill } from "@/components/ui";
import { LineEditor } from "./line-editor";
import { PaymentPanel } from "./payment-panel";
import { DealDetails } from "./deal-details";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ org }, deal] = await Promise.all([requireUser(), getDeal(id)]);
  if (!deal) {
    notFound();
  }

  const [items, products] = await Promise.all([
    listDealItems(id),
    deal.status === "open" ? listProducts({ activeOnly: true }) : Promise.resolve([]),
  ]);
  const totals = dealTotals(deal);
  const hasRecurring = totals.monthlyCents > 0 || totals.yearlyCents > 0;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <Link href="/deals" className="text-sm text-slate-500 underline">
        ← Deals
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">
            <span className="text-slate-400">#{deal.number}</span> {deal.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className={pill(deal.status)}>{deal.status}</span>
            {deal.customer ? (
              <Link href={`/customers/${deal.customer.id}`} className="underline">
                {deal.customer.name}
              </Link>
            ) : deal.lead ? (
              <Link href={`/leads/${deal.lead.id}`} className="underline">
                {deal.lead.business_name}
              </Link>
            ) : (
              <span>No customer yet</span>
            )}
            {deal.contact && (
              <span>
                {deal.contact.full_name}
                {deal.contact.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${deal.contact.phone}`} className="underline">
                      {deal.contact.phone}
                    </a>
                  </>
                )}
              </span>
            )}
            {deal.expected_close_on && deal.status === "open" && (
              <span>closes {format(new Date(`${deal.expected_close_on}T12:00:00`), "MMM d")}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">
            {summarizeTotals(totals, org.currency)}
          </div>
          {hasRecurring && (
            <div className="text-xs text-slate-500">
              {formatMoney(firstYearCents(totals), org.currency)} first year
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <LineEditor
          dealId={deal.id}
          editable={deal.status === "open"}
          items={items}
          products={products}
          totals={totals}
          currency={org.currency}
        />
        <div className="space-y-6">
          <PaymentPanel
            dealId={deal.id}
            status={deal.status}
            paymentUrl={deal.payment_url}
            paidAt={deal.paid_at}
            paidAmountCents={deal.paid_amount_cents}
            wonAt={deal.won_at}
            lostAt={deal.lost_at}
            lostReason={deal.lost_reason}
            hasLines={items.some((item) => item.unit_price_cents > 0)}
            totalLabel={summarizeTotals(totals, org.currency)}
            currency={org.currency}
          />
          <DealDetails
            dealId={deal.id}
            title={deal.title}
            expectedCloseOn={deal.expected_close_on}
            notes={deal.notes}
          />
        </div>
      </div>
    </div>
  );
}
