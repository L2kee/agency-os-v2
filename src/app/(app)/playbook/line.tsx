"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** A playbook line. Lines that start with a quote are rendered as say-verbatim
 *  cards with a copy button; everything else is guidance text. */
export function Line({ text }: { text: string }) {
  const verbatim = text.trim().startsWith('"') || text.trim().startsWith("“");
  const [copied, setCopied] = useState(false);

  if (!verbatim) {
    return <p className="text-sm text-slate-600">{text}</p>;
  }

  const clean = text.trim().replace(/^["“]|["”]$/g, "");

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="flex-1 text-sm leading-relaxed text-slate-800">{text}</p>
      <button
        onClick={() => {
          navigator.clipboard.writeText(clean).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title="Copy line"
        className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
