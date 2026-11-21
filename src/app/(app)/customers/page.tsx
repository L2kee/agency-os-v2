import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listCustomers } from "@/server/customers";
import { summarizeTotals } from "@/lib/money";
import { BUTTON, INPUT, PAGE, pill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [{ org }, customers] = await Promise.all([requireUser(), listCustomers(q?.trim() || undefined)]);

  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/customers/new" className={BUTTON}>
          <Plus size={16} aria-hidden="true" />
          New customer
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        A lead becomes a customer when a deal is won, or you can add one by hand.
      </p>

      <form className="mt-5" role="search">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input
          id="customer-search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name"
          className={`${INPUT} mt-0 sm:max-w-xs`}
        />
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {customers.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {q ? "No customers match that search." : "No customers yet. Win a deal or add one."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {customers.map((customer) => {
              const won = {
                oneTimeCents: customer.wonOneTimeCents,
                monthlyCents: customer.wonMonthlyCents,
                yearlyCents: customer.wonYearlyCents,
              };
              const hasWon = won.oneTimeCents + won.monthlyCents + won.yearlyCents > 0;
              return (
                <li key={customer.id}>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50 sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">
                        {customer.name}
                        {customer.status === "former" && (
                          <span className={`ml-2 ${pill("former")}`}>former</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[customer.primaryContact?.full_name, customer.phone ?? customer.primaryContact?.phone, customer.city]
                          .filter(Boolean)
                          .join(" · ") || (customer.kind === "person" ? "Person" : "Business")}
                      </div>
                    </div>
                    {hasWon && (
                      <span className="text-sm font-semibold tabular-nums">
                        {summarizeTotals(won, org.currency)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
