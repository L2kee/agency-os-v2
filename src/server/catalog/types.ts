import type { BillingInterval } from "@/lib/money";

export type ProductKind = "service" | "product";

export interface Product {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  category: string | null;
  sku: string | null;
  unit: string;
  unit_price_cents: number;
  billing_interval: BillingInterval;
  taxable: boolean;
  is_active: boolean;
  position: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}
