"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { addCustomLine, addProductLine, removeLine, updateLine } from "@/server/deals/actions";
import type { DealItem } from "@/server/deals/types";
import type { Product } from "@/server/catalog/types";
import {
  centsToInput,
  dollarsToCents,
  formatMoney,
  formatPrice,
  intervalSuffix,
  type Totals,
} from "@/lib/money";
import { BUTTON, BUTTON_QUIET, CARD, INPUT, LABEL } from "@/components/ui";

export function LineEditor({
  dealId,
  editable,
  items,
  products,
  totals,
  currency,
}: {
  dealId: string;
  editable: boolean;
  items: DealItem[];
  products: Product[];
  totals: Totals;
  currency: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

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

  return (
    <section className={`${CARD} ${pending ? "opacity-70" : ""}`} aria-busy={pending}>
      <h2 className="font-semibold">Items</h2>

      {editable && products.length > 0 && (
        <div className="mt-3">
          <p className={LABEL}>Add from the catalog</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                disabled={pending}
                onClick={() => run(() => addProductLine(dealId, product.id))}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus size={14} aria-hidden="true" />
                {product.name}
                <span className="text-slate-500">
                  {formatPrice(product.unit_price_cents, product.billing_interval, currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {editable && products.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">
          Tip: add your services to the{" "}
          <Link href="/catalog" className="underline">
            catalog
          </Link>{" "}
          and they show up here as one tap buttons.
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No items yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {items.map((item) => (
            <LineRow
              key={`${item.id}-${item.quantity}-${item.unit_price_cents}`}
              item={item}
              editable={editable}
              currency={currency}
              disabled={pending}
              onSave={(changes) => run(() => updateLine(dealId, item.id, changes))}
              onRemove={() => run(() => removeLine(dealId, item.id))}
            />
          ))}
        </ul>
      )}

      {editable &&
        (customOpen ? (
          <form
            action={(formData) => run(() => addCustomLine(dealId, formData), () => setCustomOpen(false))}
            className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_0.7fr]">
              <label className={LABEL}>
                Line
                <input name="name" required placeholder="Extra page" className={INPUT} />
              </label>
              <label className={LABEL}>
                Price ($)
                <input name="price" required inputMode="decimal" placeholder="150" className={INPUT} />
              </label>
              <label className={LABEL}>
                Qty
                <input name="quantity" defaultValue="1" inputMode="decimal" className={INPUT} />
              </label>
            </div>
            <label className={`${LABEL} sm:w-1/2`}>
              Billing
              <select name="billing_interval" className={INPUT}>
                <option value="">One time</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={pending} className={BUTTON}>
                Add line
              </button>
              <button type="button" onClick={() => setCustomOpen(false)} className={BUTTON_QUIET}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="mt-4 text-sm text-slate-600 underline hover:text-slate-900"
          >
            Add a custom line
          </button>
        ))}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {items.length > 0 && (
        <dl className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-sm">
          {totals.oneTimeCents > 0 && <TotalRow label="Due now" value={formatMoney(totals.oneTimeCents, currency)} />}
          {totals.monthlyCents > 0 && (
            <TotalRow label="Every month" value={formatMoney(totals.monthlyCents, currency)} />
          )}
          {totals.yearlyCents > 0 && (
            <TotalRow label="Every year" value={formatMoney(totals.yearlyCents, currency)} />
          )}
        </dl>
      )}
    </section>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function LineRow({
  item,
  editable,
  currency,
  disabled,
  onSave,
  onRemove,
}: {
  item: DealItem;
  editable: boolean;
  currency: string;
  disabled: boolean;
  onSave: (changes: { quantity: number; unit_price_cents: number }) => void;
  onRemove: () => void;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [price, setPrice] = useState(centsToInput(item.unit_price_cents));
  const [invalid, setInvalid] = useState(false);
  const lineTotal = Math.round(item.quantity * item.unit_price_cents);

  // Saves on blur, only when something actually changed.
  function commit() {
    const nextQuantity = Number(quantity);
    const nextPrice = dollarsToCents(price);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0 || nextPrice === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (nextQuantity !== item.quantity || nextPrice !== item.unit_price_cents) {
      onSave({ quantity: nextQuantity, unit_price_cents: nextPrice });
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-40">
        <div className="font-medium">{item.name}</div>
        {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
      </div>

      {editable ? (
        <div className="flex items-center gap-2 text-sm">
          <label className="sr-only" htmlFor={`qty-${item.id}`}>
            Quantity for {item.name}
          </label>
          <input
            id={`qty-${item.id}`}
            value={quantity}
            inputMode="decimal"
            disabled={disabled}
            onChange={(event) => setQuantity(event.target.value)}
            onBlur={commit}
            className="w-14 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums"
          />
          <span className="text-slate-400" aria-hidden="true">
            ×
          </span>
          <label className="sr-only" htmlFor={`price-${item.id}`}>
            Price for {item.name}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-slate-400">$</span>
            <input
              id={`price-${item.id}`}
              value={price}
              inputMode="decimal"
              disabled={disabled}
              onChange={(event) => setPrice(event.target.value)}
              onBlur={commit}
              className="w-24 rounded-md border border-slate-300 py-1 pr-2 pl-5 text-right tabular-nums"
            />
          </div>
          <span className="w-8 text-xs text-slate-500">{intervalSuffix(item.billing_interval)}</span>
        </div>
      ) : (
        <span className="text-sm text-slate-500 tabular-nums">
          {item.quantity} × {formatPrice(item.unit_price_cents, item.billing_interval, currency)}
        </span>
      )}

      <div className="w-24 text-right font-semibold tabular-nums">
        {formatPrice(lineTotal, item.billing_interval, currency)}
      </div>

      {editable && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${item.name}`}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}

      {invalid && <p className="w-full text-xs text-rose-600">Use a quantity above zero and a price like 150 or 49.50.</p>}
    </li>
  );
}
