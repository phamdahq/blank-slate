/**
 * Inventory (batches) service.
 */
import { inventoryRepo } from "@/db/repositories";
import type { Batch } from "@/db/dexie";

export function listBatchesForProduct(productId: string) {
  return inventoryRepo.byProduct(productId);
}

export function stockForProduct(productId: string) {
  return inventoryRepo.stockFor(productId);
}

export function addBatch(batch: Batch) {
  return inventoryRepo.addBatch(batch);
}

/**
 * Most recently created batch for a product in this pharmacy, used to
 * pre-fill the "Add Batch" form with the last-known pricing / supplier so
 * the user only needs to enter what actually changes.
 */
export async function latestBatchForProduct(productId: string): Promise<Batch | null> {
  const rows = await inventoryRepo.byProduct(productId);
  if (rows.length === 0) return null;
  return rows
    .slice()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
}
