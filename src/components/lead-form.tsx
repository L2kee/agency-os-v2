import type { Lead } from "@/server/leads/types";

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

/**
 * Shared new/edit form. The `action` is a Server Action bound by the caller
 * (from src/server/leads).
 */
export function LeadForm({
  action,
  lead,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  lead?: Lead;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name *">
          <input name="business_name" required defaultValue={lead?.business_name} className={FIELD} />
        </Field>
        <Field label="Category">
          <input name="category" placeholder="Plumber, Dentist…" defaultValue={lead?.category ?? ""} className={FIELD} />
        </Field>
        <Field label="Contact name">
          <input name="contact_name" defaultValue={lead?.contact_name ?? ""} className={FIELD} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={lead?.email ?? ""} className={FIELD} />
        </Field>
        <Field label="Phone">
          <input name="phone" defaultValue={lead?.phone ?? ""} className={FIELD} />
        </Field>
        <Field label="Website">
          <input name="website" placeholder="https://…" defaultValue={lead?.website ?? ""} className={FIELD} />
        </Field>
        <Field label="Address">
          <input name="address" defaultValue={lead?.address ?? ""} className={FIELD} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input name="city" defaultValue={lead?.city ?? ""} className={FIELD} />
          </Field>
          <Field label="State">
            <input name="state" defaultValue={lead?.state ?? ""} className={FIELD} />
          </Field>
        </div>
        <Field label="Deal value (USD)">
          <input
            name="deal_value"
            type="number"
            step="50"
            defaultValue={lead?.deal_value ?? 1000}
            className={FIELD}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={lead?.notes ?? ""} className={FIELD} />
      </Field>

      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
