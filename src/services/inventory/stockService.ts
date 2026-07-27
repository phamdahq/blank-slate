/**
 * Stock-addition service.
 *
 *   1. `addFirstBatch`  — used when the pharmacy has NEVER stocked this
 *      product. Requires connectivity: the parent inventory link is created
 *      by writing directly to Supabase and mirrored into Dexie afterwards
 *      (no outbox — the row must exist upstream before the UI treats the
 *      product as "in inventory").
 *
 *   2. `addAdditionalBatch` — used when the product already has at least one
 *      batch in the pharmacy. Fully offline-capable: writes to Dexie and
 *      queues an outbox `batches.upsert` for background sync.
 */
import { db, isBrowser, type Batch } from "@/db/dexie";
import { supabase } from "@/lib/supabase";
import { inventoryRepo } from "@/db/repositories";
import { OfflineError } from "@/db/catalog-remote";
import { hasProductInInventory } from "./catalogService";

export { hasProductInInventory };

/**
 * Add the first batch for a product in this pharmacy. Requires internet:
 * writes to Supabase first, then mirrors into Dexie so it lights up the
 * POS / Inventory views instantly.
 */
export async function addFirstBatch(batch: Batch): Promise<Batch> {
  if (!isBrowser || !navigator.onLine) throw new OfflineError();

  const { data, error } = await supabase
    .from("batches")
    .insert(batch)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const saved = (data ?? batch) as Batch;
  await db.batches.put(saved);
  return saved;
}

/**
 * Add a subsequent batch for a product already stocked by the pharmacy.
 * Works offline — the sync engine will drain the outbox when online.
 */
export async function addAdditionalBatch(batch: Batch): Promise<void> {
  await inventoryRepo.addBatch(batch);
}
