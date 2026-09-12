"use client";

import { useState, useTransition } from "react";
import type { EmailTemplate } from "@/server/outreach/types";
import {
  sendLeadEmailNow,
  enrollLeadInSequence,
  stopEnrollment,
  markLeadReplied,
} from "@/server/outreach/actions";

interface ActiveEnrollment {
  id: string;
  sequenceName: string;
  currentStep: number;
  nextRunAt: string | null;
}

const FIELD =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

export function EmailPanel({
  leadId,
  leadHasEmail,
  emailConfigured,
  templates,
  sequences,
  activeEnrollments,
}: {
  leadId: string;
  leadHasEmail: boolean;
  emailConfigured: boolean;
  templates: EmailTemplate[];
  sequences: { id: string; name: string }[];
  activeEnrollments: ActiveEnrollment[];
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [seqId, setSeqId] = useState("");
  const [sending, startSend] = useTransition();
  const [seqPending, startSeq] = useTransition();

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  function send() {
    setMsg(null);
    setErr(null);
    startSend(async () => {
      const res = await sendLeadEmailNow(leadId, { subject, body });
      if (res?.error) setErr(res.error);
      else {
        setMsg("Sent.");
        setSubject("");
        setBody("");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ---- Sequences ---- */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Follow-up sequence</h3>

        {activeEnrollments.length > 0 ? (
          <div className="mt-2 space-y-2">
            {activeEnrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{e.sequenceName}</span>
                  <span className="text-slate-400">
                    {" "}
                    · step {e.currentStep + 1}
                    {e.nextRunAt ? ` · next ${new Date(e.nextRunAt).toLocaleDateString()}` : ""}
                  </span>
                </span>
                <button
                  onClick={() => startSeq(() => stopEnrollment(leadId, e.id).then(() => {}))}
                  className="text-xs text-rose-600 underline"
                >
                  stop
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <select value={seqId} onChange={(e) => setSeqId(e.target.value)} className={FIELD}>
              <option value="">Choose a sequence…</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              disabled={!seqId || seqPending || !leadHasEmail}
              onClick={() =>
                startSeq(async () => {
                  const res = await enrollLeadInSequence(leadId, seqId);
                  if (res?.error) setErr(res.error);
                })
              }
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Enroll
            </button>
          </div>
        )}

        <button
          onClick={() => startSeq(() => markLeadReplied(leadId).then(() => {}))}
          className="mt-2 text-xs text-slate-500 underline hover:text-slate-900"
        >
          Mark as replied (stops all sequences)
        </button>
      </div>

      {/* ---- One-off email ---- */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Send an email now</h3>

        {!emailConfigured && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            Email sending isn&rsquo;t set up yet —{" "}
            <a href="/settings" className="underline">
              connect your email provider in Settings
            </a>
            .
          </p>
        )}
        {!leadHasEmail && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            This lead has no email address. Add one in Details.
          </p>
        )}

        <div className="mt-2 space-y-2">
          {templates.length > 0 && (
            <select defaultValue="" onChange={(e) => applyTemplate(e.target.value)} className={FIELD}>
              <option value="">Start from a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={FIELD}
          />
          <textarea
            placeholder="Message… {{first_name}}, {{business_name}} etc."
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={FIELD}
          />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          <button
            disabled={sending || !emailConfigured || !leadHasEmail || !subject || !body}
            onClick={send}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}
