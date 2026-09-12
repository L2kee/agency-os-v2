import Link from "next/link";
import { notFound } from "next/navigation";
import { getSequence, listSequenceSteps } from "@/server/outreach";
import { setSequenceActive, deleteSequence } from "@/server/outreach/actions";
import { StepsEditor } from "./steps-editor";

export const dynamic = "force-dynamic";

export default async function SequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sequence = await getSequence(id);
  if (!sequence) notFound();

  const steps = await listSequenceSteps(id);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/sequences" className="text-sm text-slate-500 underline">
        ← Sequences
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{sequence.name}</h1>
        <form action={setSequenceActive.bind(null, sequence.id, !sequence.is_active)}>
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            {sequence.is_active ? "Pause" : "Activate"}
          </button>
        </form>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {sequence.is_active
          ? "Active — enrolled leads will receive these steps on schedule."
          : "Paused — no emails will send until you activate it."}
      </p>

      <div className="mt-6">
        <StepsEditor sequenceId={sequence.id} initialSteps={steps} />
      </div>

      <form action={deleteSequence.bind(null, sequence.id)} className="mt-10 border-t border-slate-100 pt-4">
        <button className="text-sm text-rose-600 underline hover:text-rose-800">
          Delete sequence
        </button>
      </form>
    </div>
  );
}
