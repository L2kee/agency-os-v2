"use client";

import { useState, useTransition } from "react";
import { deleteDeal, updateDeal } from "@/server/deals/actions";
import { BUTTON, CARD, INPUT, LABEL, LINK_DANGER, TAP } from "@/components/ui";

export function DealDetails({
  dealId,
  title,
  expectedCloseOn,
  notes,
}: {
  dealId: string;
  title: string;
  expectedCloseOn: string | null;
  notes: string | null;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function save(formData: FormData) {
    setMessage(null);
    start(async () => {
      const result = await updateDeal(dealId, formData);
      setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: "Saved." });
    });
  }

  return (
    <section className={CARD}>
      <h2 className="font-semibold">Details</h2>
      <form action={save} className="mt-3 space-y-3">
        <label className={LABEL}>
          Title
          <input name="title" required defaultValue={title} className={INPUT} />
        </label>
        <label className={LABEL}>
          Expected to close
          <input type="date" name="expected_close_on" defaultValue={expectedCloseOn ?? ""} className={INPUT} />
        </label>
        <label className={LABEL}>
          Notes
          <textarea name="notes" rows={3} defaultValue={notes ?? ""} className={INPUT} />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={BUTTON}>
            {pending ? "Saving…" : "Save"}
          </button>
          {message && (
            <span className={`text-sm ${message.tone === "ok" ? "text-emerald-700" : "text-rose-600"}`} role="status">
              {message.text}
            </span>
          )}
        </div>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4 text-sm">
        {confirming ? (
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-slate-500">Delete this deal and its items?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => deleteDeal(dealId))}
              className={LINK_DANGER}
            >
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={`${TAP} text-slate-600 underline`}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={LINK_DANGER}>
            Delete deal
          </button>
        )}
      </div>
    </section>
  );
}
