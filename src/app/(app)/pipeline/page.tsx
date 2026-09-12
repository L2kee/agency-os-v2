import Link from "next/link";
import { getBoardLeads } from "@/server/pipeline";
import { PipelineBoard } from "./pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const leads = await getBoardLeads();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-slate-500">Drag a card to move it between stages.</p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add lead
        </Link>
      </div>
      <PipelineBoard initialLeads={leads} />
    </div>
  );
}
