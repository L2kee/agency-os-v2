import { MERGE_FIELDS } from "@/server/outreach/merge";

export function MergeHint() {
  return (
    <p className="text-xs text-slate-400">
      Merge fields:{" "}
      {MERGE_FIELDS.map((f, i) => (
        <span key={f}>
          {i > 0 && ", "}
          <code className="rounded bg-slate-100 px-1 text-slate-600">{`{{${f}}}`}</code>
        </span>
      ))}
    </p>
  );
}
