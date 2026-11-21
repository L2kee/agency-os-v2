"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { deleteProduct, saveProduct, setProductActive } from "@/server/catalog/actions";
import type { Product } from "@/server/catalog/types";
import { centsToInput, formatPrice } from "@/lib/money";
import { BUTTON, BUTTON_QUIET, CARD, INPUT, LABEL, LINK_DANGER, pill } from "@/components/ui";

const BILLING = [
  { value: "", label: "One time" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

export function CatalogManager({ products, currency }: { products: Product[]; currency: string }) {
  // null is closed, "new" is a blank form, otherwise the item being edited.
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const active = products.filter((product) => product.is_active);
  const archived = products.filter((product) => !product.is_active);
  const groups = new Map<string, Product[]>();
  for (const product of active) {
    const key = product.category ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <ProductForm
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={BUTTON}>
          <Plus size={16} aria-hidden="true" />
          Add an item
        </button>
      )}

      {products.length === 0 && !editing && (
        <p className="text-sm text-slate-500">
          Nothing here yet. Add your first service or product, like a website build or a monthly
          plan.
        </p>
      )}

      {[...groups.entries()].map(([category, items]) => (
        <section key={category} className={CARD}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">{category}</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {items.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                currency={currency}
                onEdit={() => setEditing(product)}
              />
            ))}
          </ul>
        </section>
      ))}

      {archived.length > 0 && (
        <section className={CARD}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">Archived</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {archived.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                currency={currency}
                onEdit={() => setEditing(product)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProductRow({
  product,
  currency,
  onEdit,
}: {
  product: Product;
  currency: string;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <li className={`py-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="font-medium">
            {product.name}
            {!product.is_active && <span className={`ml-2 ${pill("archived")}`}>archived</span>}
          </div>
          {product.description && (
            <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{product.description}</p>
          )}
        </div>
        <div className="text-right font-semibold tabular-nums">
          {formatPrice(product.unit_price_cents, product.billing_interval, currency)}
          {product.unit !== "each" && (
            <span className="font-normal text-slate-500"> per {product.unit}</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <button type="button" onClick={onEdit} className="text-slate-600 underline hover:text-slate-900">
          Edit
        </button>
        <button
          type="button"
          onClick={() => run(() => setProductActive(product.id, !product.is_active))}
          className="text-slate-600 underline hover:text-slate-900"
        >
          {product.is_active ? "Archive" : "Restore"}
        </button>
        {confirming ? (
          <span className="flex items-center gap-3">
            <span className="text-slate-500">Delete for good?</span>
            <button type="button" onClick={() => run(() => deleteProduct(product.id))} className={LINK_DANGER}>
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-slate-600 underline">
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={LINK_DANGER}>
            Delete
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </li>
  );
}

function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState(product?.billing_interval ?? "");

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await saveProduct(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form action={submit} className={`${CARD} space-y-4`}>
      <h2 className="font-semibold">{product ? `Edit ${product.name}` : "New catalog item"}</h2>
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className={LABEL}>
          Name
          <input name="name" required defaultValue={product?.name ?? ""} className={INPUT} />
        </label>
        <label className={LABEL}>
          Price ($)
          <input
            name="price"
            inputMode="decimal"
            required
            placeholder="997"
            defaultValue={product ? centsToInput(product.unit_price_cents) : ""}
            className={INPUT}
          />
        </label>
      </div>

      <fieldset>
        <legend className={LABEL}>Billing</legend>
        <input type="hidden" name="billing_interval" value={billing} />
        <div className="mt-1 inline-flex rounded-lg border border-slate-300 p-0.5">
          {BILLING.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={billing === option.value}
              onClick={() => setBilling(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                billing === option.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={LABEL}>
          Category
          <input
            name="category"
            placeholder="Websites"
            defaultValue={product?.category ?? ""}
            className={INPUT}
          />
        </label>
        <label className={LABEL}>
          Priced per
          <input name="unit" placeholder="each" defaultValue={product?.unit ?? "each"} className={INPUT} />
        </label>
        <label className={LABEL}>
          Type
          <select name="kind" defaultValue={product?.kind ?? "service"} className={INPUT}>
            <option value="service">Service</option>
            <option value="product">Product</option>
          </select>
        </label>
      </div>

      <label className={LABEL}>
        Description
        <textarea
          name="description"
          rows={2}
          defaultValue={product?.description ?? ""}
          className={INPUT}
        />
      </label>

      <label className={`${LABEL} sm:w-1/3`}>
        SKU (optional)
        <input name="sku" defaultValue={product?.sku ?? ""} className={INPUT} />
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={BUTTON}>
          {pending ? "Saving…" : product ? "Save changes" : "Add to catalog"}
        </button>
        <button type="button" onClick={onDone} className={BUTTON_QUIET}>
          Cancel
        </button>
      </div>
    </form>
  );
}
