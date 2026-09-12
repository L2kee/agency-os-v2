"use client";

import { useState, useTransition } from "react";
import { searchPlaces, importProspects } from "@/server/prospecting/actions";
import type { Prospect } from "@/server/prospecting/types";

export function ProspectSearch() {
  const [prospects, setProspects] = useState<Prospect[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();

  function runSearch(formData: FormData) {
    setError(null);
    setMessage(null);
    startSearch(async () => {
      const res = await searchPlaces(formData);
      if (res.error) {
        setError(res.error);
        setProspects(null);
        return;
      }
      setProspects(res.prospects ?? []);
      setSelected(new Set((res.prospects ?? []).map((p) => p.place_id)));
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runImport() {
    if (!prospects) return;
    const chosen = prospects.filter((p) => selected.has(p.place_id));
    startImport(async () => {
      const res = await importProspects(chosen);
      if (res.error) setError(res.error);
      else
        setMessage(
          `Imported ${res.imported} new lead(s) into your pipeline.` +
            (res.skipped ? ` ${res.skipped} were already there.` : ""),
        );
    });
  }

  return (
    <div>
      <form action={runSearch} className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">What</span>
          <input
            name="what"
            required
            placeholder="plumbers, dentists, roofers…"
            className="mt-1 w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Where</span>
          <input
            name="where"
            required
            placeholder="Austin, TX"
            className="mt-1 w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" name="only_no_website" defaultChecked />
          Only businesses with no website
        </label>
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
      )}

      {prospects && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {prospects.length} result(s) · {selected.size} selected
            </p>
            <button
              onClick={runImport}
              disabled={importing || selected.size === 0}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {importing ? "Importing…" : `Add ${selected.size} to pipeline`}
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Business</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Website</th>
                  <th className="px-3 py-2 font-medium">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prospects.map((p) => (
                  <tr key={p.place_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.place_id)}
                        onChange={() => toggle(p.place_id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.business_name}</div>
                      <div className="text-xs text-slate-400">{p.address}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{p.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      {p.has_website ? (
                        <a
                          href={p.website ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-500 underline"
                        >
                          has one
                        </a>
                      ) : (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                          none
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {p.rating ? `${p.rating}★ (${p.reviews ?? 0})` : "—"}
                    </td>
                  </tr>
                ))}
                {prospects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      No matches. Try unchecking the &ldquo;no website&rdquo; filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
