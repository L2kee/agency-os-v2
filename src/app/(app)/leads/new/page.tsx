import Link from "next/link";
import { LeadForm } from "@/components/lead-form";
import { createLead } from "@/server/leads";
import { TAP } from "@/components/ui";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <Link href="/leads" className={`${TAP} text-sm text-slate-500 underline`}>
        ← Leads
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Add lead</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <LeadForm action={createLead} submitLabel="Create lead" />
      </div>
    </div>
  );
}
