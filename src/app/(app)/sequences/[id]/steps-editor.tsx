"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import type { SequenceStep } from "@/server/outreach/types";
import { MergeHint } from "@/components/merge-hint";
import { saveSteps } from "@/server/outreach/actions";

type Draft = {
  id: string;
  day_offset: number;
  subject: string;
  body: string;
};

let tmp = 0;
const newDraft = (): Draft => ({
  id: `tmp-${tmp++}`,
  day_offset: 3,
  subject: "",
  body: "",
});

const FIELD =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

export function StepsEditor({
  sequenceId,
  initialSteps,
}: {
  sequenceId: string;
  initialSteps: SequenceStep[];
}) {
  const [steps, setSteps] = useState<Draft[]>(
    initialSteps.length
      ? initialSteps.map((s) => ({
          id: s.id,
          day_offset: s.day_offset,
          subject: s.subject,
          body: s.body,
        }))
      : [{ ...newDraft(), day_offset: 0 }],
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function patch(id: string, p: Partial<Draft>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
    setSaved(false);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveSteps(sequenceId, steps);
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={step.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Step {i + 1}</span>
            <button
              onClick={() => {
                setSteps((prev) => prev.filter((s) => s.id !== step.id));
                setSaved(false);
              }}
              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            {i === 0 ? "Send" : "Wait"}
            <input
              type="number"
              min={0}
              value={step.day_offset}
              onChange={(e) => patch(step.id, { day_offset: Number(e.target.value) })}
              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
            {i === 0 ? "days after enrolling (0 = immediately)" : "days after the previous step"}
          </label>

          <input
            placeholder="Subject"
            value={step.subject}
            onChange={(e) => patch(step.id, { subject: e.target.value })}
            className={`${FIELD} mt-3`}
          />
          <textarea
            placeholder="Email body…"
            rows={6}
            value={step.body}
            onChange={(e) => patch(step.id, { body: e.target.value })}
            className={`${FIELD} mt-2`}
          />
        </div>
      ))}

      <button
        onClick={() => {
          setSteps((prev) => [...prev, newDraft()]);
          setSaved(false);
        }}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
      >
        <Plus size={16} /> Add step
      </button>

      <MergeHint />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save sequence"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </div>
  );
}
