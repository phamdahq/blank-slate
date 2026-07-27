/**
 * Global (Supabase) product catalog access.
 *
 * Adding stock REQUIRES connectivity: owners may only register batches for
 * products that already exist in the upstream `products` table. Results are
 * cached into Dexie so the POS can render them offline afterwards.
 */
import { db, isBrowser, type Product } from "./dexie";
import { supabase } from "./supabase";

export class OfflineError extends Error {
  constructor() {
    super("You must be online to search the global product catalog.");
    this.name = "OfflineError";
  }
}

function assertOnline() {
  if (!isBrowser || !navigator.onLine) throw new OfflineError();
}

export async function searchGlobalProducts(term: string, limit = 25): Promise<Product[]> {
  assertOnline();
  const t = term.trim();
  let query = supabase.from("products").select("*").limit(limit).order("name");
  if (t) query = query.or(`name.ilike.%${t}%,generic_name.ilike.%${t}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Product[];
  if (rows.length) await db.products.bulkPut(rows);
  return rows;
}

/** Validate a product id against the upstream catalog. Online-only. */
export async function fetchGlobalProduct(id: string): Promise<Product | null> {
  assertOnline();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Product;
  await db.products.put(row);
  return row;
}
