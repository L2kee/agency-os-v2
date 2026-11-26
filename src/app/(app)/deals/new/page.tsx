import Link from "next/link";
import { createDeal } from "@/server/deals";
import { listCustomerOptions } from "@/server/customers";
import { BUTTON, CARD, INPUT, LABEL, TAP } from "@/components/ui";

export const dynamic = "force-dynamic";

// Most deals start from a lead or customer page. This page covers starting
// one from scratch, optionally for an existing customer.
export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const [{ customer }, customers] = await Promise.all([searchParams, listCustomerOptions()]);

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-8">
      <Link href="/deals" className={`${TAP} text-sm text-slate-500 underline`}>
        ← Deals
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New deal</h1>

      <form action={createDeal} className={`${CARD} mt-6 space-y-4`}>
        <label className={LABEL}>
          Title
          <input name="title" required placeholder="Website and AI front desk" className={INPUT} />
        </label>
        <label className={LABEL}>
          Customer (optional)
          <select name="customer_id" defaultValue={customer ?? ""} className={INPUT}>
            <option value="">No customer yet</option>
            {customers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} sm:w-1/2`}>
          Expected to close
          <input type="date" name="expected_close_on" className={INPUT} />
        </label>
        <button type="submit" className={BUTTON}>
          Create deal and add items
        </button>
      </form>
    </div>
  );
}
