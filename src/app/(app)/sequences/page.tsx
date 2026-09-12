import Link from "next/link";
import { listSequences, countActiveEnrollmentsBySequence } from "@/server/outreach";
import { createSequence } from "@/server/outreach/actions";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const [sequences, activeBySeq] = await Promise.all([
    listSequences(),
    countActiveEnrollmentsBySequence(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Sequences</h1>
      <p className="mt-1 text-sm text-slate-500">
        Multi-step follow-up cadences. Enroll leads from their detail page.
      </p>

      <form action={createSequence} className="mt-6 flex gap-2">
        <input
          name="name"
          placeholder="New sequence name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Create
        </button>
      </form>

      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {sequences.map((s) => (
          <Link
            key={s.id}
            href={`/sequences/${s.id}`}
            className="flex items-center justify-between p-4 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-slate-400">
                {activeBySeq.get(s.id) ?? 0} active enrollment(s)
              </div>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {s.is_active ? "active" : "paused"}
            </span>
          </Link>
        ))}
        {sequences.length === 0 && <p className="p-6 text-sm text-slate-400">No sequences yet.</p>}
      </div>
    </div>
  );
}
