/**
 * Realtime + startup pull-down for pharmacy-scoped tables.
 *
 * Startup:
 *   `pullAll(pharmacyId)` freshens the local Dexie mirror for products,
 *   batches, and sales the moment the app boots (or a user signs in).
 *
 * Realtime:
 *   `startRealtimeSync(pharmacyId)` subscribes to Supabase postgres_changes
 *   so remote INSERT / UPDATE / DELETE events immediately reshape Dexie.
 *   Dexie writes fan out via useLiveQuery, so every open view refreshes
 *   without polling. Returns a cleanup function.
 */
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { db, isBrowser, type Batch, type Expense, type Product, type SaleRow } from "@/db/dexie";
import { supabase } from "@/lib/supabase";

// ---------------- Initial pull ----------------

export async function pullAll(pharmacyId: string): Promise<void> {
  if (!isBrowser || !navigator.onLine) return;
  await Promise.all([
    pullProducts(),
    pullBatches(pharmacyId),
    pullSales(pharmacyId),
    pullExpenses(pharmacyId),
  ]);
}

async function pullProducts(): Promise<void> {
  const { data, error } = await supabase.from("products").select("*");
  if (error || !data) return;
  await db.products.bulkPut(data as Product[]);
}

async function pullBatches(pharmacyId: string): Promise<void> {
  const { data, error } = await supabase
    .from("pharmacy_batches")
    .select("*")
    .eq("pharmacy_id", pharmacyId);
  if (error || !data) return;
  await db.transaction("rw", db.batches, async () => {
    // Replace the local slice for this pharmacy so remote deletions are honored.
    const stale = await db.batches
      .where("pharmacy_id")
      .equals(pharmacyId)
      .primaryKeys();
    await db.batches.bulkDelete(stale);
    await db.batches.bulkPut(data as Batch[]);
  });
}

async function pullSales(pharmacyId: string): Promise<void> {
  const { data, error } = await supabase
    .from("pharmacy_sales")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return;
  await db.sales.bulkPut(data as SaleRow[]);
}

async function pullExpenses(pharmacyId: string): Promise<void> {
  const { data, error } = await supabase
    .from("pharmacy_expenses")
    .select("*")
    .eq("pharmacy_id", pharmacyId);
  if (error || !data) return;
  await db.expenses.bulkPut(data as Expense[]);
}

// ---------------- Realtime channels ----------------

type AnyRow = { id?: string; [k: string]: unknown };

function makeHandler(table: "products" | "batches" | "sales" | "expenses") {
  return async (payload: RealtimePostgresChangesPayload<AnyRow>) => {
    const row = (payload.new ?? {}) as AnyRow;
    const oldRow = (payload.old ?? {}) as AnyRow;
    try {
      if (payload.eventType === "DELETE") {
        const id = oldRow.id;
        if (!id) return;
        await (db[table] as unknown as { delete: (k: string) => Promise<void> }).delete(id);
      } else if (row.id) {
        await (db[table] as unknown as { put: (r: unknown) => Promise<unknown> }).put(row);
      }
    } catch (err) {
      // Realtime deltas are best-effort — never crash the UI.
      console.warn(`[realtime] ${table} apply failed:`, err);
    }
  };
}

export function startRealtimeSync(pharmacyId: string): () => void {
  if (!isBrowser) return () => {};

  const channel = supabase
    .channel(`phamda:${pharmacyId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      makeHandler("products"),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "batches",
        filter: `pharmacy_id=eq.${pharmacyId}`,
      },
      makeHandler("batches"),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sales",
        filter: `pharmacy_id=eq.${pharmacyId}`,
      },
      makeHandler("sales"),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "expenses",
        filter: `pharmacy_id=eq.${pharmacyId}`,
      },
      makeHandler("expenses"),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
