import Link from "next/link";
import { CARD, TAP } from "@/components/ui";
import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-xl p-4 sm:p-8">
      <Link href="/customers" className={`${TAP} text-sm text-slate-500 underline`}>
        ← Customers
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New customer</h1>
      <div className={`${CARD} mt-6`}>
        <CustomerForm />
      </div>
    </div>
  );
}
