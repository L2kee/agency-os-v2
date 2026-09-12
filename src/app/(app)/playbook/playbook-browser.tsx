"use client";

import { useMemo, useState } from "react";
import { SECTIONS, SCRIPTS, OBJECTIONS, OBJECTION_CATEGORIES, type SectionId } from "@/server/playbook/data";
import { PlaybookNote } from "./note";
import { Line } from "./line";

export function PlaybookBrowser({ notes }: { notes: Record<string, string> }) {
  const [section, setSection] = useState<SectionId>("mindset");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const query = q.trim().toLowerCase();

  const scripts = useMemo(() => {
    let list = SCRIPTS;
    if (!query) list = list.filter((s) => s.section === section);
    if (query)
      list = list.filter((s) =>
        (s.title + " " + s.lines.join(" ") + " " + (s.tip ?? "")).toLowerCase().includes(query),
      );
    return list;
  }, [section, query]);

  const objections = useMemo(() => {
    let list = OBJECTIONS;
    if (cat !== "all") list = list.filter((o) => o.category === cat);
    if (query)
      list = list.filter((o) =>
        (o.triggers.join(" ") + " " + o.why + " " + o.responses.join(" ")).toLowerCase().includes(query),
      );
    return list;
  }, [cat, query]);

  const showObjections = query ? objections.length > 0 : section === "objections";
  const showScripts = query ? scripts.length > 0 : section !== "objections";

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search every script and objection… (e.g. “too expensive”, “nephew”, “call me back”)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />

      {!query && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                section === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {!query && <p className="mt-3 text-sm text-slate-500">{SECTIONS.find((s) => s.id === section)?.blurb}</p>}

      {/* Scripts */}
      {showScripts && (
        <div className="mt-5 space-y-4">
          {scripts.map((s) => (
            <article key={s.key} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold">{s.title}</h3>
              <div className="mt-3 space-y-2">
                {s.lines.map((line, i) => (
                  <Line key={i} text={line} />
                ))}
              </div>
              {s.tip && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">💡 {s.tip}</p>
              )}
              <PlaybookNote itemKey={s.key} initial={notes[s.key] ?? ""} />
            </article>
          ))}
        </div>
      )}

      {/* Objections */}
      {showObjections && (
        <div className="mt-6">
          {!query && (
            <div className="flex flex-wrap gap-1.5">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>
                All
              </Chip>
              {OBJECTION_CATEGORIES.map((c) => (
                <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-4">
            {objections.map((o) => (
              <article key={o.key} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap gap-1.5">
                  {o.triggers.map((t) => (
                    <span key={t} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                      “{t}”
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">What&rsquo;s really going on</p>
                <p className="text-sm text-slate-600">{o.why}</p>

                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Say</p>
                <div className="space-y-2">
                  {o.responses.map((r, i) => (
                    <Line key={i} text={r} />
                  ))}
                </div>

                {o.thenDo && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <strong>Then:</strong> {o.thenDo}
                  </p>
                )}
                <PlaybookNote itemKey={o.key} initial={notes[o.key] ?? ""} />
              </article>
            ))}
          </div>
        </div>
      )}

      {query && scripts.length === 0 && objections.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">Nothing matched “{q}”.</p>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
