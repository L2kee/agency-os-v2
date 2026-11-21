"use client";

import { useState, useTransition } from "react";
import { deleteCustomer } from "@/server/customers/actions";
import { LINK_DANGER } from "@/components/ui";

export function DeleteCustomer({ customerId }: { customerId: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={LINK_DANGER}>
        Delete customer
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-slate-500">Delete this customer and their contacts? Their deals stay.</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => deleteCustomer(customerId))}
        className={LINK_DANGER}
      >
        Yes, delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm text-slate-600 underline">
        Cancel
      </button>
    </span>
  );
}
