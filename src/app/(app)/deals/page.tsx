import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { dealTotals, listDeals, type DealStatus } from "@/server/deals";
import { summarizeTotals } from "@/lib/money";
import { BUTTON, PAGE, pill } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS: { label: string; status?: DealStatus }[] = [
  { label: "Open", status: "open" },
  { label: "Won", status: "won" },
  { label: "Lost", status: "lost" },
  { label: "All" },
];

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: raw } = await searchParams;
  const status = TABS.find((tab) => tab.status === raw)?.status ?? (raw === "all" ? undefined : "open");
  const [{ org }, deals] = await Promise.all([requireUser(), listDeals(status)]);

  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Deals</h1>
        <Link href="/deals/new" className={BUTTON}>
          <Plus size={16} aria-hidden="true" />
          New deal
        </Link>
      </div>

      <nav className="mt-5 flex gap-1 border-b border-slate-200 text-sm" aria-label="Deal status">
        {TABS.map((tab) => {
          const current = tab.status === status;
          return (
            <Link
              key={tab.label}
              href={`/deals?status=${tab.status ?? "all"}`}
              aria-current={current ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 ${
                current
                  ? "border-slate-900 font-medium text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {deals.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No deals here yet. Start one from a lead, a customer, or the New deal button.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deals.map((deal) => (
              <li key={deal.id}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50 sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      <span className="text-slate-400">#{deal.number}</span> {deal.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {deal.customer?.name ?? deal.lead?.business_name ?? "No customer yet"}
                      {" · updated "}
                      {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {summarizeTotals(dealTotals(deal), org.currency)}
                    </span>
                    {!status && <span className={pill(deal.status)}>{deal.status}</span>}
                    {deal.status === "open" && deal.payment_url && (
                      <span className={pill("active")}>link sent</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
