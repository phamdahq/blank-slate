/**
 * Background sync engine.
 *
 * Contract with the UI:
 *   - Repositories write to Dexie and enqueue an OutboxEntry in a single
 *     transaction. UI never blocks on the network.
 *   - This engine drains the outbox in FIFO order whenever the browser is
 *     online. Each op is translated to a Supabase RPC / insert.
 *   - Sales are committed via the `record_sale` Postgres function which
 *     atomically decrements batch quantity server-side (last-write-wins on
 *     the sale row, atomic on stock — see supabase/migrations).
 *
 * Import from browser code only. `startSyncEngine()` no-ops on the server.
 */
import { db, isBrowser, type OutboxEntry, type OutboxOp } from "./dexie";
import { supabase } from "./supabase";

let started = false;
let draining = false;
let pending = false;

type Listener = (state: SyncState) => void;
const listeners = new Set<Listener>();

export type SyncEvent =
  | {
      kind: "sale-voided-insufficient-stock";
      sale_id: string;
      product_id: string;
      batch_id: string;
      quantity: number;
    }
  | { kind: "sale-voided-other"; sale_id: string; message: string };

type EventListener = (e: SyncEvent) => void;
const eventListeners = new Set<EventListener>();

export function subscribeSyncEvents(l: EventListener): () => void {
  eventListeners.add(l);
  return () => eventListeners.delete(l);
}

function emitEvent(e: SyncEvent) {
  for (const l of eventListeners) l(e);
}

export interface SyncState {
  online: boolean;
  draining: boolean;
  lastError?: string;
  lastSyncedAt?: number;
}

let state: SyncState = {
  online: isBrowser ? navigator.onLine : true,
  draining: false,
};

function emit(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l(state);
}

export function subscribeSync(l: Listener): () => void {
  listeners.add(l);
  l(state);
  return () => listeners.delete(l);
}


export function getSyncState() {
  return state;
}

export function startSyncEngine() {
  if (!isBrowser || started) return;
  started = true;

  const onOnline = () => {
    emit({ online: true });
    void drain();
  };
  const onOffline = () => emit({ online: false });

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void drain();
  });

  // First attempt shortly after boot so seeded / queued ops flush.
  setTimeout(() => void drain(), 250);
}

/** Kick a drain cycle. Safe to call concurrently. */
export async function drain(): Promise<void> {
  if (!isBrowser) return;
  if (draining) {
    pending = true;
    return;
  }
  if (!navigator.onLine) return;

  draining = true;
  emit({ draining: true, lastError: undefined });

  try {
    while (true) {
      const next = await db.outbox
        .where("status")
        .anyOf(["pending", "failed"])
        .sortBy("created_at");
      const entry = next[0];
      if (!entry || entry.id === undefined) break;

      await db.outbox.update(entry.id, { status: "in-flight" });
      try {
        await applyOp(entry.op);
        await db.outbox.delete(entry.id);
        emit({ lastSyncedAt: Date.now() });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await db.outbox.update(entry.id, {
          status: "failed",
          attempts: (entry.attempts ?? 0) + 1,
          last_error: msg,
        });
        emit({ lastError: msg });
        // Stop draining on error to avoid tight retry loops; next online
        // event / visibility change will retry.
        break;
      }
    }
  } finally {
    draining = false;
    emit({ draining: false });
    if (pending) {
      pending = false;
      void drain();
    }
  }
}

async function applyOp(op: OutboxOp): Promise<void> {
  switch (op.kind) {
    case "sales.insert": {
      // Atomic server-side decrement + insert. See migration `record_sale`.
      const { error } = await supabase.rpc("record_sale", {
        p_sale_id: op.row.id,
        p_pharmacy_id: op.row.pharmacy_id,
        p_product_id: op.row.product_id,
        p_batch_id: op.row.batch_id,
        p_quantity: op.row.quantity_sold,
        p_cost_price: op.row.cost_price_at_sale,
        p_selling_price: op.row.selling_price_at_sale,
        p_transaction_id: op.row.transaction_id ?? null,
        p_sale_date: op.row.sale_date,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "batches.upsert": {
      const { error } = await supabase.from("batches").upsert(op.row);
      if (error) throw new Error(error.message);
      return;
    }
    case "expenses.insert": {
      const { error } = await supabase.from("expenses").insert(op.row);
      if (error) throw new Error(error.message);
      return;
    }
    case "pharmacy_settings.upsert": {
      const { error } = await supabase
        .from("pharmacy_settings")
        .upsert(op.row, { onConflict: "pharmacy_id" });
      if (error) throw new Error(error.message);
      return;
    }
    case "users.update": {
      // RLS restricts this to the caller's own row; never trust client ids for
      // anything else.
      const { error } = await supabase.from("users").update(op.patch).eq("id", op.id);
      if (error) throw new Error(error.message);
      return;
    }
  }
}

/** Enqueue an op inside an existing Dexie transaction. */
export async function enqueue(op: OutboxOp): Promise<void> {
  const entry: OutboxEntry = {
    op,
    created_at: Date.now(),
    attempts: 0,
    status: "pending",
  };
  await db.outbox.add(entry);
  // Fire-and-forget drain attempt.
  if (isBrowser && navigator.onLine) void drain();
}

export async function outboxCount(): Promise<number> {
  if (!isBrowser) return 0;
  return db.outbox.count();
}
