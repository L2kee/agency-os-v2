"use client";

import { useState, useTransition } from "react";
import { saveCustomer } from "@/server/customers/actions";
import type { Customer } from "@/server/customers/types";
import { BUTTON, INPUT, LABEL } from "@/components/ui";

/** Create or edit a customer. A new customer opens its page after saving. */
export function CustomerForm({ customer }: { customer?: Customer }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [kind, setKind] = useState(customer?.kind ?? "business");

  function submit(formData: FormData) {
    setMessage(null);
    start(async () => {
      const result = await saveCustomer(formData);
      if (result?.error) {
        setMessage({ tone: "error", text: result.error });
      } else if (customer) {
        setMessage({ tone: "ok", text: "Saved." });
      }
    });
  }

  return (
    <form action={submit} className="space-y-4">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <input type="hidden" name="kind" value={kind} />

      <fieldset>
        <legend className={LABEL}>This customer is</legend>
        <div className="mt-1 inline-flex rounded-lg border border-slate-300 p-0.5">
          {(["business", "person"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                kind === option ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {option === "business" ? "A business" : "A person"}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={LABEL}>
        {kind === "person" ? "Full name" : "Business name"}
        <input name="name" required defaultValue={customer?.name ?? ""} className={INPUT} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL}>
          Phone
          <input name="phone" type="tel" defaultValue={customer?.phone ?? ""} className={INPUT} />
        </label>
        <label className={LABEL}>
          Email
          <input name="email" type="email" defaultValue={customer?.email ?? ""} className={INPUT} />
        </label>
      </div>

      {kind === "business" && (
        <label className={LABEL}>
          Website
          <input name="website" defaultValue={customer?.website ?? ""} className={INPUT} />
        </label>
      )}

      <label className={LABEL}>
        Address
        <input name="address_line1" defaultValue={customer?.address_line1 ?? ""} className={INPUT} />
      </label>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <label className={LABEL}>
          City
          <input name="city" defaultValue={customer?.city ?? ""} className={INPUT} />
        </label>
        <label className={LABEL}>
          State
          <input name="state" defaultValue={customer?.state ?? ""} className={INPUT} />
        </label>
        <label className={LABEL}>
          ZIP
          <input name="postal_code" defaultValue={customer?.postal_code ?? ""} className={INPUT} />
        </label>
      </div>

      <label className={LABEL}>
        Notes
        <textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} className={INPUT} />
      </label>

      {customer && (
        <label className={`${LABEL} sm:w-1/2`}>
          Status
          <select name="status" defaultValue={customer.status} className={INPUT}>
            <option value="active">Active</option>
            <option value="former">Former customer</option>
          </select>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BUTTON}>
          {pending ? "Saving…" : customer ? "Save changes" : "Add customer"}
        </button>
        {message && (
          <span className={`text-sm ${message.tone === "ok" ? "text-emerald-700" : "text-rose-600"}`} role="status">
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
