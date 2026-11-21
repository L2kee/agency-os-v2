import { listProducts } from "@/server/catalog";
import { requireUser } from "@/server/auth";
import { PAGE } from "@/components/ui";
import { CatalogManager } from "./catalog-manager";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [{ org }, products] = await Promise.all([requireUser(), listProducts()]);

  return (
    <div className={PAGE}>
      <h1 className="text-2xl font-semibold">Catalog</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything you sell, with its price. Add items to a deal in one tap.
      </p>
      <div className="mt-6">
        <CatalogManager products={products} currency={org.currency} />
      </div>
    </div>
  );
}
