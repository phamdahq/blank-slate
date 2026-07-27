/**
 * Inventory catalog picker service.
 *
 * Searches the global Supabase `products` table for products that are NOT
 * already present in the pharmacy's local inventory. Requires connectivity
 * because it must consult the upstream catalog.
 */
import { db, isBrowser, type Product } from "@/db/dexie";
import { supabase } from "@/lib/supabase";
import { OfflineError } from "@/db/catalog-remote";

function assertOnline() {
  if (!isBrowser || !navigator.onLine) throw new OfflineError();
}

/** IDs of products the pharmacy already stocks (has at least one batch for). */
export async function localProductIdsForPharmacy(pharmacyId: string): Promise<string[]> {
  if (!isBrowser) return [];
  const rows = await db.batches.where("pharmacy_id").equals(pharmacyId).toArray();
  return [...new Set(rows.map((b) => b.product_id))];
}

/** True if the pharmacy already has this product in inventory (locally). */
export async function hasProductInInventory(
  pharmacyId: string,
  productId: string,
): Promise<boolean> {
  if (!isBrowser) return false;
  const count = await db.batches
    .where("[product_id+expiry_date]")
    .between([productId, ""], [productId, "\uffff"])
    .filter((b) => b.pharmacy_id === pharmacyId)
    .count();
  return count > 0;
}

/**
 * Search the global catalog, excluding products already stocked by this
 * pharmacy. Online-only. Mirrors results into Dexie so subsequent renders
 * can resolve product metadata even offline.
 */
export async function searchAvailableGlobalProducts(
  pharmacyId: string,
  term: string,
  limit = 50,
): Promise<Product[]> {
  assertOnline();
  const excluded = await localProductIdsForPharmacy(pharmacyId);
  const t = term.trim();

  let query = supabase.from("products").select("*").order("name").limit(limit);
  if (t) query = query.or(`name.ilike.%${t}%,generic_name.ilike.%${t}%`);
  if (excluded.length > 0) {
    query = query.not("id", "in", `(${excluded.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Product[];
  if (rows.length) await db.products.bulkPut(rows);
  return rows;
}
