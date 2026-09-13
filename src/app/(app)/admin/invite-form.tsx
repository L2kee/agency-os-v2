"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { inviteMember } from "@/server/access/actions";

export function InviteForm() {
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <UserPlus size={16} className="text-slate-400" /> Invite someone
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        They get an email with a link to set a password and sign in.
      </p>
      <form
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const res = await inviteMember(fd);
            if (res?.error) setMsg({ err: res.error });
            else setMsg({ ok: `Invite sent to ${res?.email}.` });
          });
        }}
        className="mt-3 flex gap-2"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="person@company.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send invite"}
        </button>
      </form>
      {msg?.err && <p className="mt-2 text-sm text-rose-600">{msg.err}</p>}
      {msg?.ok && <p className="mt-2 text-sm text-emerald-600">{msg.ok}</p>}
    </div>
  );
}
