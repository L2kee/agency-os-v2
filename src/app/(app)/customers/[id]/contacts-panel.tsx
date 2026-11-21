"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { deleteContact, saveContact } from "@/server/customers/actions";
import type { Contact } from "@/server/customers/types";
import { BUTTON, BUTTON_QUIET, CARD, INPUT, LABEL } from "@/components/ui";

export function ContactsPanel({ customerId, contacts }: { customerId: string; contacts: Contact[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // null is closed, "new" is a blank form, otherwise the contact being edited.
  const [editing, setEditing] = useState<Contact | "new" | null>(null);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      after?.();
    });
  }

  const current = editing === "new" ? null : editing;

  return (
    <section className={CARD} aria-busy={pending}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Contacts</h2>
        {!editing && (
          <button type="button" onClick={() => setEditing("new")} className={BUTTON_QUIET}>
            <Plus size={16} aria-hidden="true" />
            Add contact
          </button>
        )}
      </div>

      {contacts.length === 0 && !editing && <p className="mt-3 text-sm text-slate-500">No contacts yet.</p>}

      <ul className="mt-3 divide-y divide-slate-100">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
            <div>
              <div className="font-medium">
                {contact.full_name}
                {contact.is_primary && <span className="ml-2 text-xs font-normal text-slate-500">primary</span>}
              </div>
              <div className="text-slate-500">
                {[contact.title, contact.phone, contact.email].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(contact)} className="text-slate-600 underline">
                Edit
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteContact(customerId, contact.id))}
                className="text-rose-600 underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <form
          key={current?.id ?? "new"}
          action={(formData) => run(() => saveContact(customerId, formData), () => setEditing(null))}
          className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4"
        >
          {current && <input type="hidden" name="id" value={current.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              Name
              <input name="full_name" required defaultValue={current?.full_name ?? ""} className={INPUT} />
            </label>
            <label className={LABEL}>
              Title
              <input name="title" placeholder="Office manager" defaultValue={current?.title ?? ""} className={INPUT} />
            </label>
            <label className={LABEL}>
              Phone
              <input name="phone" type="tel" defaultValue={current?.phone ?? ""} className={INPUT} />
            </label>
            <label className={LABEL}>
              Email
              <input name="email" type="email" defaultValue={current?.email ?? ""} className={INPUT} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="is_primary" defaultChecked={current?.is_primary ?? contacts.length === 0} />
            Primary contact
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className={BUTTON}>
              {current ? "Save contact" : "Add contact"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className={BUTTON_QUIET}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  );
}
