/**
 * Read-model over the local Dexie inventory.
 *
 * Everything the UI renders (inventory table, POS list, reports) is derived
 * from locally-persisted batches + cached global products. No network calls.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { db, isBrowser, type ProductCategory } from "@/db/dexie";

export const LOW_STOCK_LEVEL = 40;
export const EXPIRING_SOON_DAYS = 90;
export const TAX_RATE = 0;

export interface CatalogBatch {
  id: string;
  batch_number: string;
  quantity: number;
  expiry: string; // YYYY-MM-DD
  price: number;
  cost: number;
  expiringSoon?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  strength: string;
  brand: string;
  generic: string;
  form: string;
  category: ProductCategory | "other";
  ndc: string;
  price: number;
  stock: number;
  reorderLevel: number;
  packSize: number;
  releaseType: string;
  batches: CatalogBatch[];
}

export type Batch = CatalogBatch;

export const categories = [
  "All",
  "pharmaceutical",
  "cosmetic",
  "medical_device",
  "supplies",
] as const;

export type CategoryFilter = (typeof categories)[number];

export const categoryLabels: Record<CategoryFilter, string> = {
  All: "All",
  pharmaceutical: "Pharmaceutical",
  cosmetic: "Cosmetic",
  medical_device: "Medical device",
  supplies: "Supplies",
};

export function stockStatus(med: {
  stock: number;
  reorderLevel: number;
}): "critical" | "low" | "ok" | "high" {
  if (med.stock <= med.reorderLevel * 0.25) return "critical";
  if (med.stock <= med.reorderLevel) return "low";
  if (med.stock >= med.reorderLevel * 5) return "high";
  return "ok";
}

function daysBetween(iso: string): number {
  const d = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(d)) return Number.POSITIVE_INFINITY;
  return Math.ceil((d - Date.now()) / 86_400_000);
}

/**
 * Live catalog of everything currently in the local inventory, scoped to the
 * active pharmacy. Reactively updates on any Dexie write (including sync).
 */
export function useCatalog(pharmacyId?: string | null): Medication[] {
  return (
    useLiveQuery(
      async () => {
        // Never fall back to *all* tenants' batches: while the session is
        // still resolving, pharmacyId is null and rendering everything looks
        // like the global catalog flashing into the inventory page.
        if (!isBrowser || !pharmacyId) return [];
        const batches = await db.batches.where("pharmacy_id").equals(pharmacyId).toArray();
        if (batches.length === 0) return [];

        const productIds = [...new Set(batches.map((b) => b.product_id))];
        const products = await db.products.bulkGet(productIds);
        const packs = await db.medicine_packs.toArray();

        const byProduct = new Map<string, typeof batches>();
        for (const b of batches) {
          const list = byProduct.get(b.product_id) ?? [];
          list.push(b);
          byProduct.set(b.product_id, list);
        }

        const meds: Medication[] = [];
        products.forEach((p, i) => {
          const id = productIds[i];
          const rows = (byProduct.get(id) ?? []).sort((a, b) =>
            a.expiry_date.localeCompare(b.expiry_date),
          );
          if (rows.length === 0) return;
          const stock = rows.reduce((s, b) => s + b.quantity, 0);
          const pack = packs.find((k) => k.product_id === id);
          meds.push({
            id,
            name: p?.name ?? "Unknown product",
            strength: p?.strength ?? "",
            brand: p?.name ?? "",
            generic: p?.generic_name ?? "",
            form: p?.dosage_form ?? "—",
            category: (p?.category as ProductCategory | undefined) ?? "other",
            ndc: id.slice(0, 8),
            price: rows[0]?.selling_price ?? 0,
            stock,
            reorderLevel: LOW_STOCK_LEVEL,
            packSize: pack?.pack_size ?? 1,
            releaseType: p?.release_type ?? "IR",
            batches: rows.map((b) => ({
              id: b.id,
              batch_number: b.batch_number,
              quantity: b.quantity,
              expiry: b.expiry_date,
              price: b.selling_price,
              cost: b.purchase_cost,
              expiringSoon: daysBetween(b.expiry_date) <= EXPIRING_SOON_DAYS,
            })),
          });
        });

        return meds.sort((a, b) => a.name.localeCompare(b.name));
      },
      [pharmacyId],
      [] as Medication[],
    ) ?? []
  );
}
