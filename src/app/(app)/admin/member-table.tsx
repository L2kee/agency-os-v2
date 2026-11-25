"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { setMemberActive, setMemberRole, removeMember } from "@/server/access/actions";
import type { MemberRow } from "@/server/access/types";

export function MemberTable({
  rows,
  currentUserId,
}: {
  rows: MemberRow[];
  currentUserId: string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string } | void>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setErr(res.error);
    });
  }

  return (
    <div>
      {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
      {/* On phones Status moves under the email and the box scrolls sideways as a
          fallback, so Role and Remove are always reachable. */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const isSelf = r.id === currentUserId;
              return (
                <tr key={r.id} className={pending ? "opacity-60" : ""}>
                  <td className="px-4 py-3">
                    <div className="break-all font-medium">{r.email}</div>
                    <div className="text-xs text-slate-400">
                      {r.lastSignIn
                        ? `last seen ${formatDistanceToNow(new Date(r.lastSignIn), { addSuffix: true })}`
                        : `added ${formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}`}
                      {isSelf && " · you"}
                    </div>
                    <div className="mt-1 sm:hidden">
                      <StatusBadge r={r} />
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge r={r} />
                  </td>
                  <td className="px-4 py-3">
                    {r.role === "owner" ? (
                      <span className="text-sm text-slate-600">Owner</span>
                    ) : (
                    <select
                      value={r.role}
                      disabled={isSelf || pending}
                      onChange={(e) =>
                        run(() => setMemberRole(r.id, e.target.value as "member" | "admin"))
                      }
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && r.role !== "owner" && (
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <button
                          onClick={() => run(() => setMemberActive(r.id, !r.isActive))}
                          className="text-xs text-slate-500 underline hover:text-slate-900"
                        >
                          {r.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${r.email}? Their leads, deals, and customers move to you.`))
                              run(() => removeMember(r.id));
                          }}
                          className="text-xs text-rose-600 underline hover:text-rose-800"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "rose" | "amber" | "emerald"; children: React.ReactNode }) {
  const cls = {
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }[tone];
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function StatusBadge({ r }: { r: MemberRow }) {
  if (!r.isActive) return <Badge tone="rose">deactivated</Badge>;
  if (r.invitedNotAccepted) return <Badge tone="amber">invite sent</Badge>;
  return <Badge tone="emerald">active</Badge>;
}
