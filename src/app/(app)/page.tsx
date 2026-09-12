import Link from "next/link";
import { getDashboardStats } from "@/server/leads";
import { getFollowUpsDue } from "@/server/calling";
import { stageLabel } from "@/server/pipeline/stages";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function DashboardPage() {
  const [stats, followUpsDue] = await Promise.all([getDashboardStats(), getFollowUpsDue()]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Your web-design agency at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Open leads" value={String(stats.openCount)} />
        <Stat label="Pipeline value" value={money(stats.pipelineValue)} />
        <Stat label="Deals won" value={String(stats.wonCount)} />
        <Stat label="Revenue won" value={money(stats.wonValue)} />
      </div>

      {followUpsDue.length > 0 && (
        <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Follow-ups due ({followUpsDue.length})</h2>
          <div className="mt-3 divide-y divide-amber-200">
            {followUpsDue.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="flex items-center justify-between py-2 text-sm text-amber-900 hover:opacity-70"
              >
                <span className="font-medium">{l.business_name}</span>
                <span className="text-xs">
                  {l.phone ? l.phone + " · " : ""}
                  {stageLabel(l.stage)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pipeline</h2>
          <Link href="/pipeline" className="text-sm text-slate-500 underline">
            Open board
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {stats.byStage.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${s.accent}`} />
              <span className="w-32 text-sm text-slate-600">{s.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-slate-800"
                  style={{
                    width: `${stats.totalLeads ? (s.count / stats.totalLeads) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-sm tabular-nums text-slate-500">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Recently updated</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {stats.recentlyUpdated.map((l) => (
            <Link
              key={l.id}
              href={`/leads/${l.id}`}
              className="flex items-center justify-between py-2 text-sm hover:text-slate-500"
            >
              <span>{l.business_name}</span>
              <span className="text-slate-400">{stageLabel(l.stage)}</span>
            </Link>
          ))}
          {stats.recentlyUpdated.length === 0 && (
            <p className="py-4 text-sm text-slate-400">
              No leads yet.{" "}
              <Link href="/leads/new" className="underline">
                Add one
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
