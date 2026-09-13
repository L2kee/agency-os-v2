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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Status</th>
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
                    <div className="font-medium">{r.email}</div>
                    <div className="text-xs text-slate-400">
                      {r.lastSignIn
                        ? `last seen ${formatDistanceToNow(new Date(r.lastSignIn), { addSuffix: true })}`
                        : `added ${formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}`}
                      {isSelf && " · you"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {!r.isActive ? (
                      <Badge tone="rose">deactivated</Badge>
                    ) : r.invitedNotAccepted ? (
                      <Badge tone="amber">invite sent</Badge>
                    ) : (
                      <Badge tone="emerald">active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => run(() => setMemberActive(r.id, !r.isActive))}
                          className="text-xs text-slate-500 underline hover:text-slate-900"
                        >
                          {r.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${r.email} and delete all their data?`))
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
