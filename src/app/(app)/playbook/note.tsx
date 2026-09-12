"use client";

import { useState, useTransition } from "react";
import { StickyNote } from "lucide-react";
import { savePlaybookNote } from "@/server/calling/actions";

export function PlaybookNote({ itemKey, initial }: { itemKey: string; initial: string }) {
  const [open, setOpen] = useState(Boolean(initial));
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<string>(initial);
  const [pending, start] = useTransition();

  function persist() {
    if (value === saved) return;
    start(async () => {
      await savePlaybookNote(itemKey, value);
      setSaved(value);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700"
      >
        <StickyNote size={13} /> Add your note
      </button>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={persist}
        rows={2}
        placeholder="Your tweak, what worked, a better line…"
        className="w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm outline-none focus:border-amber-400"
      />
      <span className="text-xs text-slate-400">
        {pending ? "Saving…" : value === saved ? "Saved to your playbook" : "Unsaved"}
      </span>
    </div>
  );
}
