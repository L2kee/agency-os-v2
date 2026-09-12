import { ProspectSearch } from "./prospect-search";

export default function ProspectingPage() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Prospecting</h1>
      <p className="mt-1 text-sm text-slate-500">
        Find local businesses by type and location. Businesses with no website are
        your best targets — import them straight into the pipeline.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <ProspectSearch />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Data from the Google Places API. Only public business information is
        returned. Respect Google&rsquo;s terms — this is for outreach, not resale.
      </p>
    </div>
  );
}
