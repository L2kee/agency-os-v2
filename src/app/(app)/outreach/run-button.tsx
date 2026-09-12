"use client";

import { useState, useTransition } from "react";
import { runDueNow } from "@/server/outreach/actions";

export function RunButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() =>
          start(async () => {
            const r = await runDueNow();
            setResult(`Processed ${r.processed} · sent ${r.sent}${r.failed ? ` · ${r.failed} failed` : ""}`);
          })
        }
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send due emails now"}
      </button>
      {result && <span className="text-sm text-slate-500">{result}</span>}
    </div>
  );
}
