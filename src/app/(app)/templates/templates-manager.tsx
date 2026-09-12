"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { EmailTemplate } from "@/server/outreach/types";
import { MergeHint } from "@/components/merge-hint";
import { saveTemplate, deleteTemplate } from "@/server/outreach/actions";

type Draft = { id?: string; name: string; subject: string; body: string };

const EMPTY: Draft = { name: "", subject: "", body: "" };
const FIELD =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

export function TemplatesManager({ templates }: { templates: EmailTemplate[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    if (!draft) return;
    setError(null);
    start(async () => {
      const res = await saveTemplate(draft);
      if (res?.error) setError(res.error);
      else setDraft(null);
    });
  }

  return (
    <div className="space-y-4">
      {!draft && (
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={16} /> New template
        </button>
      )}

      {draft && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <input
            autoFocus
            placeholder="Template name (e.g. Cold intro)"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={FIELD}
          />
          <input
            placeholder="Subject line"
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className={FIELD}
          />
          <textarea
            placeholder="Hi {{first_name}}, I came across {{business_name}}…"
            rows={8}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className={FIELD}
          />
          <MergeHint />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setDraft(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {templates.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="font-medium">{t.name}</div>
              <div className="truncate text-sm text-slate-500">{t.subject || "(no subject)"}</div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.body}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setDraft({ id: t.id, name: t.name, subject: t.subject, body: t.body })}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && !draft && (
          <p className="p-6 text-sm text-slate-400">No templates yet.</p>
        )}
      </div>
    </div>
  );
}
