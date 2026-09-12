import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { LeadForm } from "@/components/lead-form";
import { getLead, listActivities, updateLead, deleteLead, addActivity } from "@/server/leads";
import { StageSelect } from "./stage-select";

export const dynamic = "force-dynamic";

const ACTIVITY_TYPES = ["note", "call", "email", "meeting"] as const;

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const timeline = await listActivities(id);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link href="/leads" className="text-sm text-slate-500 underline">
        ← Leads
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{lead.business_name}</h1>
          {lead.city && (
            <p className="text-sm text-slate-500">
              {lead.city}
              {lead.state ? `, ${lead.state}` : ""}
            </p>
          )}
        </div>
        <StageSelect leadId={lead.id} stage={lead.stage} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Details</h2>
            <LeadForm action={updateLead.bind(null, lead.id)} lead={lead} submitLabel="Save changes" />
            <form action={deleteLead.bind(null, lead.id)} className="mt-6 border-t border-slate-100 pt-4">
              <button className="text-sm text-rose-600 underline hover:text-rose-800">
                Delete lead
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Activity</h2>

            <form action={addActivity.bind(null, lead.id)} className="space-y-2">
              <select name="type" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <textarea
                name="body"
                rows={2}
                required
                placeholder="Logged a call, sent a proposal…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
              <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
                Log
              </button>
            </form>

            <ol className="mt-5 space-y-3">
              {timeline.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                      {a.type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-700">{a.body}</p>
                </li>
              ))}
              {timeline.length === 0 && <li className="text-sm text-slate-400">No activity yet.</li>}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
