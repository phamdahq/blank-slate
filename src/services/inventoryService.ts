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
