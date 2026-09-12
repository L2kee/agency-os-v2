import Link from "next/link";
import { listLeads } from "@/server/leads";
import { stageLabel } from "@/server/pipeline/stages";

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

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">
                    {l.business_name}
                  </Link>
                  {l.city && (
                    <span className="ml-2 text-xs text-slate-400">
                      {l.city}
                      {l.state ? `, ${l.state}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{l.category ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{stageLabel(l.stage)}</td>
                <td className="px-4 py-3">
                  {l.has_website === false ? (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                      none
                    </span>
                  ) : l.website_quality === "outdated" ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      outdated
                    </span>
                  ) : l.website ? (
                    <a
                      href={l.website}
                      target="_blank"
                      className="text-xs text-slate-500 underline"
                      rel="noreferrer"
                    >
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {(l.deal_value ?? 0).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No leads yet.{" "}
                  <Link href="/leads/new" className="underline">
                    Add one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
