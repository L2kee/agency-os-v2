"use client";

import { useState, useTransition } from "react";
import { deleteLead } from "@/server/leads/actions";

// Two step delete: the first click asks, the second one deletes. Locks while
// the server action runs so repeat clicks can't fire extra deletes.
export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-rose-600 underline hover:text-rose-800"
      >
        Delete lead
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-slate-700">
        Delete this lead and its activity, emails, and sequence enrollments? This can&apos;t be undone.
      </span>
      <button
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-slate-500 underline hover:text-slate-900 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={() => start(() => deleteLead(leadId))}
        disabled={pending}
        className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
    </div>
  );
}
