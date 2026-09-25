import Link from "next/link";
import { listLeads } from "@/server/leads";
import { LeadsTable } from "./leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const leads = await listLeads(q);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Link
          href="/leads/new"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add lead
        </Link>
      </div>

      <form className="mt-4">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search business name…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </form>

      <LeadsTable leads={leads} />
    </div>
  );
}
