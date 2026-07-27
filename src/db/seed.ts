/**
 * First-run seed. Populates Dexie with a demo pharmacy + products/batches
 * derived from mock-data so the app is usable offline before any cloud sync.
 *
 * Idempotent: guarded by a meta flag. Safe to call on every boot.
 */
import { db, isBrowser, type Batch, type Product } from "./dexie";
import { medications } from "@/lib/mock-data";

export const DEMO_PHARMACY_ID = "00000000-0000-4000-8000-000000000001";

export async function seedIfEmpty() {
  if (!isBrowser) return;
  const flag = await db.meta.get("seeded_v1");
  if (flag) return;

  await db.transaction(
    "rw",
    [
      db.pharmacies,
      db.pharmacy_settings,
      db.products,
      db.medicine_packs,
      db.batches,
      db.meta,
    ],
    async () => {

      await db.pharmacies.put({
        id: DEMO_PHARMACY_ID,
        name: "Phamda Demo Pharmacy",
        country: "Ethiopia",
        city: "Addis Ababa",
        tier: "pro",
        subscription_status: "active",
      });
      await db.pharmacy_settings.put({
        pharmacy_id: DEMO_PHARMACY_ID,
        expire_level: 90,
        deadstock: 90,
      });

      const products: Product[] = [];
      const batches: Batch[] = [];

      for (const m of medications) {
        products.push({
          id: m.id,
          name: m.name,
          generic_name: m.generic,
          dosage_form: m.form,
          strength: m.strength,
          UOM: "unit",
          release_type: m.releaseType,
          category: "pharmaceutical",
        });

        // If mock has batches, seed them; else create a single synthetic batch.
        if (m.batches?.length) {
          for (const b of m.batches) {
            batches.push({
              id: `${m.id}-${b.id}`,
              pharmacy_id: DEMO_PHARMACY_ID,
              product_id: m.id,
              batch_number: b.id,
              expiry_date: normalizeExpiry(b.expiry),
              quantity: b.quantity,
              purchase_cost: Math.max(0, m.price * 0.6),
              selling_price: m.price,
            });
          }
        } else {
          batches.push({
            id: `${m.id}-seed`,
            pharmacy_id: DEMO_PHARMACY_ID,
            product_id: m.id,
            batch_number: "SEED-1",
            expiry_date: futureDate(365),
            quantity: m.stock,
            purchase_cost: Math.max(0, m.price * 0.6),
            selling_price: m.price,
          });
        }
      }

      await db.products.bulkPut(products);
      await db.batches.bulkPut(batches);
      await db.meta.put({ key: "seeded_v1", value: new Date().toISOString() });
      await db.meta.put({ key: "active_pharmacy_id", value: DEMO_PHARMACY_ID });
    },
  );
}

function normalizeExpiry(s: string): string {
  // mock uses "YYYY-MM"; pad to a full ISO date.
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-28`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return futureDate(180);
}

function futureDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
