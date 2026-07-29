/**
 * Read-models backing the "Inventory Health" report tabs.
 *
 * Everything is derived live from the local Dexie mirror (batches, sales and
 * pharmacy settings) so the report works fully offline.
 */
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, isBrowser } from "@/db/dexie";
import { DEFAULT_SETTINGS, settingsRepo } from "@/db/pharmacy-config";

export interface InventoryRules {
  /** Days before expiry at which a batch is flagged. */
  expireLevel: number;
  /** Days without a sale after which an item is dead stock. */
  deadstock: number;
}

/** Live pharmacy inventory rules; refreshes from the server when online. */
export function useInventoryRules(pharmacyId?: string | null): InventoryRules {
  useEffect(() => {
    if (!pharmacyId) return;
    void settingsRepo.refresh(pharmacyId);
  }, [pharmacyId]);

  const row = useLiveQuery(
    async () => {
      if (!isBrowser || !pharmacyId) return undefined;
      return settingsRepo.local(pharmacyId);
    },
    [pharmacyId],
    undefined,
  );

  return {
    expireLevel: row?.expire_level ?? DEFAULT_SETTINGS.expire_level,
    deadstock: row?.deadstock ?? DEFAULT_SETTINGS.deadstock,
  };
}

export interface ProductSalesStat {
  units: number;
  revenue: number;
  cost: number;
  /** Days since the most recent sale, or null when never sold. */
  daysSinceLastSale: number | null;
  lastSaleDate: string | null;
  /** Units sold in the last 30 days. */
  units30: number;
  /** Units sold in the 30 days before that (for the growth trend). */
  unitsPrev30: number;
}

const DAY = 86_400_000;

function dayDiff(iso: string): number {
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - t) / DAY);
}

/** Live per-product sales aggregates from the local sales table. */
export function useSalesStats(
  pharmacyId?: string | null,
): Map<string, ProductSalesStat> {
  return (
    useLiveQuery(
      async () => {
        const map = new Map<string, ProductSalesStat>();
        if (!isBrowser) return map;
        const sales = pharmacyId
          ? await db.sales.where("pharmacy_id").equals(pharmacyId).toArray()
          : await db.sales.toArray();

        for (const s of sales) {
          const stat =
            map.get(s.product_id) ??
            ({
              units: 0,
              revenue: 0,
              cost: 0,
              daysSinceLastSale: null,
              lastSaleDate: null,
              units30: 0,
              unitsPrev30: 0,
            } satisfies ProductSalesStat);

          stat.units += s.quantity_sold;
          stat.revenue += s.quantity_sold * s.selling_price_at_sale;
          stat.cost += s.quantity_sold * s.cost_price_at_sale;

          const age = dayDiff(s.sale_date);
          if (age <= 30) stat.units30 += s.quantity_sold;
          else if (age <= 60) stat.unitsPrev30 += s.quantity_sold;

          if (stat.daysSinceLastSale === null || age < stat.daysSinceLastSale) {
            stat.daysSinceLastSale = age;
            stat.lastSaleDate = s.sale_date;
          }

          map.set(s.product_id, stat);
        }
        return map;
      },
      [pharmacyId],
      new Map<string, ProductSalesStat>(),
    ) ?? new Map<string, ProductSalesStat>()
  );
}

/** Whole days from now until an ISO date (negative once past). */
export function daysUntilDate(iso: string): number {
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.ceil((t - Date.now()) / DAY);
}
