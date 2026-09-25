"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteLeads } from "@/server/leads/actions";
import { stageLabel } from "@/server/pipeline/stages";
import type { Lead } from "@/server/leads/types";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const headerBox = useRef<HTMLInputElement>(null);

  // Only rows currently on screen count as selected, so a search or a delete
  // can never leave hidden leads queued for deletion.
  const visibleIds = useMemo(() => new Set(leads.map((l) => l.id)), [leads]);
  const activeIds = [...selected].filter((id) => visibleIds.has(id));
  const count = activeIds.length;
  const allSelected = leads.length > 0 && count === leads.length;

  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = count > 0 && !allSelected;
  }, [count, allSelected]);

  function toggle(id: string) {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setConfirming(false);
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function clear() {
    setConfirming(false);
    setSelected(new Set());
  }

  function remove() {
    setErr(null);
    setMsg(null);
    start(async () => {
      const res = await deleteLeads(activeIds);
      if (res.error) {
        setErr(res.error);
        return;
      }
      setMsg(`Deleted ${res.deleted} lead${res.deleted === 1 ? "" : "s"}.`);
      setSelected(new Set());
      setConfirming(false);
      router.refresh();
    });
  }

  const noun = `${count} lead${count === 1 ? "" : "s"}`;

  return (
    <div className="mt-4">
      {count > 0 && (
        <div className="sticky top-2 z-10 mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          {confirming ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-slate-700">
                Delete {noun}? This also deletes their activity, emails, and sequence enrollments. This
                can&apos;t be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={remove}
                  disabled={pending}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : `Delete ${noun}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-700">{count} selected</p>
              <div className="flex items-center gap-4">
                <button onClick={clear} className="text-slate-500 underline hover:text-slate-900">
                  Clear
                </button>
                <button
                  onClick={() => setConfirming(true)}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700"
                >
                  Delete selected
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
      {msg && count === 0 && <p className="mb-2 text-sm text-emerald-600">{msg}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  ref={headerBox}
                  type="checkbox"
                  aria-label="Select all leads"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={leads.length === 0 || pending}
                  className="h-4 w-4 cursor-pointer align-middle"
                />
              </th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr
                key={l.id}
                className={`hover:bg-slate-50 ${selected.has(l.id) ? "bg-slate-100" : ""} ${
                  pending && selected.has(l.id) ? "opacity-50" : ""
                }`}
              >
                <td className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${l.business_name}`}
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                    disabled={pending}
                    className="h-4 w-4 cursor-pointer align-middle"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">
                    {l.business_name}
                  </Link>
                  {l.city && (
                    <span className="ml-2 text-xs text-slate-400">
                      {l.city}
                      {l.state ? `, ${l.state}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{l.category ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{stageLabel(l.stage)}</td>
                <td className="px-4 py-3">
                  {l.has_website === false ? (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                      none
                    </span>
                  ) : l.website_quality === "outdated" ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      outdated
                    </span>
                  ) : l.website ? (
                    <a
                      href={l.website}
                      target="_blank"
                      className="text-xs text-slate-500 underline"
                      rel="noreferrer"
                    >
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {(l.deal_value ?? 0).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No leads yet.{" "}
                  <Link href="/leads/new" className="underline">
                    Add one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
