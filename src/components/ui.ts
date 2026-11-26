// Shared Tailwind class strings for the sales screens, so every form and
// card lines up on the same sizes. Pure strings, safe anywhere.

export const CARD = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";

export const LABEL = "block text-xs font-medium text-slate-500";

export const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900";

export const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";

export const BUTTON_QUIET =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

/** Text links and small buttons get a 44px tall tap area on phones, same look. */
export const TAP = "inline-flex min-h-11 items-center sm:min-h-0";

export const LINK_DANGER = `${TAP} text-sm text-rose-600 underline hover:text-rose-800 disabled:opacity-50`;

export const PAGE = "mx-auto max-w-5xl p-4 sm:p-8";

const STATUS_TONES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
  active: "bg-emerald-100 text-emerald-700",
  former: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-600",
};

/** Classes for a small status pill. */
export function pill(status: string) {
  return `inline-block rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_TONES[status] ?? "bg-slate-100 text-slate-600"}`;
}
