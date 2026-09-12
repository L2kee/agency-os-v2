import { listTemplates } from "@/server/outreach";
import { TemplatesManager } from "./templates-manager";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Email templates</h1>
      <p className="mt-1 text-sm text-slate-500">
        Reusable emails for one-off sends and sequence steps.
      </p>
      <div className="mt-6">
        <TemplatesManager templates={templates} />
      </div>
    </div>
  );
}
