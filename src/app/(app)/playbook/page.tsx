import { listPlaybookNotes } from "@/server/calling";
import { PlaybookBrowser } from "./playbook-browser";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const notes = await listPlaybookNotes();

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Cold-call playbook</h1>
      <p className="mt-1 text-sm text-slate-500">
        Scripts and objection responses for selling local businesses a website. Open a lead and hit{" "}
        <strong>Call</strong> to run these live with the business name filled in.
      </p>
      <div className="mt-6">
        <PlaybookBrowser notes={notes} />
      </div>
    </div>
  );
}
