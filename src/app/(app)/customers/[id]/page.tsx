import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getCustomer, listContacts } from "@/server/customers";
import { createDeal, dealTotals, listDealsFor } from "@/server/deals";
import { summarizeTotals } from "@/lib/money";
import { BUTTON_QUIET, CARD, pill } from "@/components/ui";
import { CustomerForm } from "../customer-form";
import { ContactsPanel } from "./contacts-panel";
import { DeleteCustomer } from "./delete-customer";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ org }, customer] = await Promise.all([requireUser(), getCustomer(id)]);
  if (!customer) {
    notFound();
  }
  const [contacts, deals] = await Promise.all([listContacts(id), listDealsFor({ customerId: id })]);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <Link href="/customers" className="text-sm text-slate-500 underline">
        ← Customers
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className={pill(customer.status)}>{customer.status}</span>
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="underline">
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="underline">
              {customer.email}
            </a>
          )}
          {customer.source_lead_id && (
            <Link href={`/leads/${customer.source_lead_id}`} className="underline">
              Original lead
            </Link>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className={CARD}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Deals</h2>
              <form action={createDeal}>
                <input type="hidden" name="customer_id" value={customer.id} />
                <button type="submit" className={BUTTON_QUIET}>
                  <Plus size={16} aria-hidden="true" />
                  New deal
                </button>
              </form>
            </div>
            {deals.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No deals yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {deals.map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/deals/${deal.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-slate-500"
                    >
                      <span>
                        <span className="text-slate-400">#{deal.number}</span> {deal.title}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {summarizeTotals(dealTotals(deal), org.currency)}
                        </span>
                        <span className={pill(deal.status)}>{deal.status}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ContactsPanel customerId={customer.id} contacts={contacts} />
        </div>

        <section className={CARD}>
          <h2 className="mb-4 font-semibold">Details</h2>
          <CustomerForm customer={customer} />
          <div className="mt-6 border-t border-slate-100 pt-4">
            <DeleteCustomer customerId={customer.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
