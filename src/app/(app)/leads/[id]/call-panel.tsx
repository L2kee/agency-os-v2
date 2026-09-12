"use client";

import { useMemo, useState, useTransition } from "react";
import { Phone, X, PhoneCall } from "lucide-react";
import { mergeValues, renderMerge } from "@/server/outreach/merge";
import { SCRIPTS, OBJECTIONS, OBJECTION_CATEGORIES, CALL_OUTCOMES, outcomeById } from "@/server/playbook/data";
import type { Lead } from "@/server/leads/types";
import { logCallOutcome } from "@/server/calling/actions";

export function CallPanel({ lead, senderName }: { lead: Lead; senderName: string }) {
  const [open, setOpen] = useState(false);
  const values = useMemo(() => mergeValues(lead, senderName || "me"), [lead, senderName]);
  const r = (s: string) => renderMerge(s, values);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <PhoneCall size={16} />
        Call {lead.business_name}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <div className="font-semibold">{lead.business_name}</div>
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-emerald-700">
                <Phone size={13} /> {lead.phone}
              </a>
            ) : (
              <span className="text-xs text-slate-400">no phone number on file</span>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <Opener lead={lead} r={r} />
          <QuickObjections r={r} />
          <LogOutcome leadId={lead.id} onDone={() => setOpen(false)} />
        </div>
      </div>
    </div>
  );
}

function Say({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
      {children}
    </p>
  );
}

function Opener({ lead, r }: { lead: Lead; r: (s: string) => string }) {
  // Pick the opener that matches this lead's situation.
  const openerKey =
    lead.has_website === false
      ? "opener-no-website"
      : lead.website_quality === "outdated"
        ? "opener-bad-website"
        : "opener-permission";

  const permission = SCRIPTS.find((s) => s.key === "opener-permission")!;
  const situational = SCRIPTS.find((s) => s.key === openerKey)!;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Opener</h3>
      <div className="space-y-2">
        {permission.lines.map((l, i) => (
          <Say key={i}>{r(l)}</Say>
        ))}
      </div>
      {situational.key !== "opener-permission" && (
        <>
          <p className="mt-3 mb-2 text-xs uppercase tracking-wide text-slate-400">{situational.title}</p>
          <div className="space-y-2">
            {situational.lines.map((l, i) => (
              <Say key={i}>{r(l)}</Say>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function QuickObjections({ r }: { r: (s: string) => string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const query = q.trim().toLowerCase();

  const list = useMemo(() => {
    let items = OBJECTIONS;
    if (cat !== "all") items = items.filter((o) => o.category === cat);
    if (query)
      items = items.filter((o) =>
        (o.triggers.join(" ") + " " + o.why + " " + o.responses.join(" ")).toLowerCase().includes(query),
      );
    return items;
  }, [cat, query]);

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">They pushed back — jump to a response</h3>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type what they said…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        <MiniChip active={cat === "all"} onClick={() => setCat("all")}>
          All
        </MiniChip>
        {OBJECTION_CATEGORIES.map((c) => (
          <MiniChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label}
          </MiniChip>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {list.map((o) => {
          const isOpen = expanded === o.key;
          return (
            <div key={o.key} className="rounded-lg border border-slate-200">
              <button
                onClick={() => setExpanded(isOpen ? null : o.key)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
              >
                <span className="font-medium text-slate-700">“{o.triggers[0]}”</span>
                <span className="text-xs text-slate-400">{isOpen ? "–" : "+"}</span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-slate-100 p-3">
                  <p className="text-xs text-slate-500">{o.why}</p>
                  {o.responses.map((resp, i) => (
                    <Say key={i}>{r(resp)}</Say>
                  ))}
                  {o.thenDo && (
                    <p className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      <strong>Then:</strong> {o.thenDo}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-slate-400">No match — check the full Playbook.</p>}
      </div>
    </section>
  );
}

function LogOutcome({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [outcome, setOutcome] = useState(CALL_OUTCOMES[0].id);
  const [notes, setNotes] = useState("");
  const [moveStage, setMoveStage] = useState(true);
  const [followUp, setFollowUp] = useState<number | "">(CALL_OUTCOMES[0].followUpDays ?? "");
  const [pending, start] = useTransition();

  const oc = outcomeById(outcome);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Log the outcome</h3>

      <select
        value={outcome}
        onChange={(e) => {
          setOutcome(e.target.value);
          setFollowUp(outcomeById(e.target.value)?.followUpDays ?? "");
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        {CALL_OUTCOMES.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="What was said, name, best callback time…"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <label className="flex items-center gap-1.5">
          Follow up in
          <input
            type="number"
            min={0}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-16 rounded border border-slate-300 px-2 py-1"
          />
          days
        </label>
        {oc?.moveTo && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={moveStage} onChange={(e) => setMoveStage(e.target.checked)} />
            Move to “{oc.moveTo}”
          </label>
        )}
      </div>

      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await logCallOutcome(leadId, {
              outcome,
              notes,
              followUpDays: followUp === "" ? null : followUp,
              moveStage,
            });
            onDone();
          })
        }
        className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save & close"}
      </button>
    </section>
  );
}

function MiniChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2 py-1 text-xs font-medium transition ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
