import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireUser } from "@/server/auth";
import { getOutreachQueueData } from "@/server/outreach";
import { RunButton } from "./run-button";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const { user } = await requireUser();
  const { due, upcoming, recentEmails, sendingReady } = await getOutreachQueueData(user.id);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Outreach</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sequence emails waiting to go out. Locally, click the button to send due
        emails; in production a scheduled job runs this hourly.
      </p>

      {!sendingReady && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          You haven&rsquo;t set up email sending —{" "}
          <Link href="/settings" className="underline">
            add your email provider in Settings
          </Link>
          . Sequences will queue but not send.
        </p>
      )}

      <div className="mt-5">
        <RunButton />
      </div>

      <Section title={`Due now (${due.length})`}>
        {due.map((e) => (
          <Row
            key={e.id}
            leadName={e.leadName}
            leadId={e.lead_id}
            seq={e.sequenceName}
            step={e.current_step + 1}
            when="now"
          />
        ))}
        {due.length === 0 && <Empty>Nothing due.</Empty>}
      </Section>

      <Section title={`Upcoming (${upcoming.length})`}>
        {upcoming.map((e) => (
          <Row
            key={e.id}
            leadName={e.leadName}
            leadId={e.lead_id}
            seq={e.sequenceName}
            step={e.current_step + 1}
            when={
              e.next_run_at
                ? formatDistanceToNow(new Date(e.next_run_at), { addSuffix: true })
                : "—"
            }
          />
        ))}
        {upcoming.length === 0 && <Empty>No upcoming steps.</Empty>}
      </Section>

      <Section title="Recent emails">
        {recentEmails.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>
              <span className="font-medium">{m.leadName ?? m.to_email}</span>
              <span className="text-slate-400"> · {m.subject}</span>
            </span>
            <span
              className={
                m.status === "sent"
                  ? "text-emerald-600"
                  : m.status === "failed"
                    ? "text-rose-600"
                    : "text-slate-400"
              }
            >
              {m.status}
              {m.opened_at ? " · opened" : ""}
            </span>
          </div>
        ))}
        {recentEmails.length === 0 && <Empty>No emails sent yet.</Empty>}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {children}
      </div>
    </div>
  );
}

function Row({
  leadName,
  leadId,
  seq,
  step,
  when,
}: {
  leadName?: string;
  leadId: string;
  seq?: string;
  step: number;
  when: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
      <span>
        {leadName ? (
          <Link href={`/leads/${leadId}`} className="font-medium hover:underline">
            {leadName}
          </Link>
        ) : (
          <span className="text-slate-400">(deleted lead)</span>
        )}
        <span className="text-slate-400">
          {" "}
          · {seq ?? "sequence"} · step {step}
        </span>
      </span>
      <span className="text-slate-400">{when}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-4 text-sm text-slate-400">{children}</p>;
}
