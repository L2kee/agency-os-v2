"use client";

import { useTransition } from "react";
import { STAGES, type StageId } from "@/server/pipeline/stages";
import { moveLeadToStage } from "@/server/pipeline/actions";

export function StageSelect({ leadId, stage }: { leadId: string; stage: StageId }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={stage}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => moveLeadToStage(leadId, e.target.value as StageId, Date.now()))
      }
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-slate-900 disabled:opacity-50"
    >
      {STAGES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
