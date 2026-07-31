/**
 * Repository layer. UI code should read/write through these functions only —
 * never touch Dexie tables directly. Repos coordinate:
 *   1. Local mutation (Dexie transaction)
 *   2. Outbox enqueue for eventual Supabase sync
 *
 * FEFO (First-Expired-First-Out) is the default batch pick strategy in the
 * POS module. Callers may override by passing an explicit batch id.
 */
import { db, type Batch, type Product, type SaleRow, type Expense } from "./dexie";
import { enqueue } from "./sync";

// ---------------- Products ----------------

export const productsRepo = {
  async search(q: string, limit = 50): Promise<Product[]> {
    const term = q.trim().toLowerCase();
    if (!term) return db.products.limit(limit).toArray();
    const all = await db.products.toArray();
    return all
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.generic_name ?? "").toLowerCase().includes(term),
      )
      .slice(0, limit);
  },
  get(id: string) {
    return db.products.get(id);
  },
  list() {
    return db.products.toArray();
  },
};

// ---------------- Inventory (batches) ----------------

export const inventoryRepo = {
  /** All batches for a product, ordered by expiry ascending (FEFO). */
  async byProduct(productId: string): Promise<Batch[]> {
    const rows = await db.batches.where("product_id").equals(productId).toArray();
    return rows.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  },

  /** Total on-hand stock across all batches for a product. */
  async stockFor(productId: string): Promise<number> {
    const rows = await this.byProduct(productId);
    return rows.reduce((s, b) => s + b.quantity, 0);
  },

  /**
   * FEFO pick: return the earliest-expiring batch with at least `qty` stock.
   * Returns null if no single batch can satisfy the quantity.
   */
  async pickFEFO(productId: string, qty: number): Promise<Batch | null> {
    const rows = await this.byProduct(productId);
    return rows.find((b) => b.quantity >= qty) ?? null;
  },

  /** Add a new batch locally and queue for sync. */
  async addBatch(batch: Batch): Promise<void> {
    await db.transaction("rw", db.batches, db.outbox, async () => {
      await db.batches.put(batch);
      await enqueue({ kind: "batches.upsert", row: batch });
    });
  },

  /**
   * Decrement local quantity for a batch. Used after a sale is committed
   * locally; the server-side RPC decrements authoritatively on sync.
   */
  async localDecrement(batchId: string, qty: number): Promise<void> {
    await db.transaction("rw", db.batches, async () => {
      const b = await db.batches.get(batchId);
      if (!b) return;
      await db.batches.update(batchId, {
        quantity: Math.max(0, b.quantity - qty),
      });
    });
  },
};

// ---------------- Sales / POS ----------------

export interface CheckoutLine {
  product_id: string;
  batch_id?: string; // omit for FEFO
  quantity: number;
  selling_price: number;
}

export interface CheckoutResult {
  transaction_id: string;
  sales: SaleRow[];
  total: number;
}

export const salesRepo = {
  /**
   * Commit a POS checkout offline-first.
   *   1. Resolve batch per line (FEFO if none provided)
   *   2. Insert one sale row per line + decrement local batch stock
   *   3. Enqueue each sale for the atomic server-side `record_sale` RPC
   *
   * Runs inside a single Dexie transaction; on failure, nothing persists.
   */
  async checkout(
    pharmacy_id: string,
    lines: CheckoutLine[],
  ): Promise<CheckoutResult> {
    if (lines.length === 0) throw new Error("Cart is empty");

    const transaction_id = `TXN-${Date.now().toString(36).toUpperCase()}`;
    const sale_date = new Date().toISOString().slice(0, 10);
    const sales: SaleRow[] = [];

    await db.transaction("rw", db.batches, db.sales, db.outbox, async () => {
      for (const line of lines) {
        // Resolve batch: explicit -> FEFO -> earliest with any stock.
        let batch: Batch | undefined;
        if (line.batch_id) {
          batch = await db.batches.get(line.batch_id);
        }
        if (!batch) {
          const rows = await db.batches
            .where("product_id")
            .equals(line.product_id)
            .toArray();
          rows.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
          batch =
            rows.find((b) => b.quantity >= line.quantity) ??
            rows.find((b) => b.quantity > 0);
        }
        if (!batch) {
          throw new Error(`No stock available for product ${line.product_id}`);
        }
        if (batch.quantity < line.quantity) {
          throw new Error(
            `Insufficient stock in batch ${batch.batch_number} (have ${batch.quantity}, need ${line.quantity})`,
          );
        }

        const sale: SaleRow = {
          id: crypto.randomUUID(),
          transaction_id,
          pharmacy_id,
          product_id: line.product_id,
          batch_id: batch.id,
          quantity_sold: line.quantity,
          cost_price_at_sale: batch.purchase_cost,
          selling_price_at_sale: line.selling_price,
          sale_date,
          created_at: new Date().toISOString(),
        };

        await db.sales.add(sale);
        await db.batches.update(batch.id, {
          quantity: Math.max(0, batch.quantity - line.quantity),
        });
        await db.outbox.add({
          op: { kind: "sales.insert", row: sale },
          created_at: Date.now(),
          attempts: 0,
          status: "pending",
        });

        sales.push(sale);
      }
    });

    // Kick drain outside the transaction.
    void import("./sync").then(({ drain }) => drain());

    const total = sales.reduce(
      (s, x) => s + x.selling_price_at_sale * x.quantity_sold,
      0,
    );
    return { transaction_id, sales, total };
  },

  recentSales(limit = 50) {
    return db.sales.orderBy("created_at").reverse().limit(limit).toArray();
  },
};

// ---------------- Expenses ----------------

export const expensesRepo = {
  async add(row: Expense): Promise<void> {
    await db.transaction("rw", db.expenses, db.outbox, async () => {
      await db.expenses.put(row);
      await enqueue({ kind: "expenses.insert", row });
    });
  },
  list(pharmacy_id: string) {
    return db.expenses.where("pharmacy_id").equals(pharmacy_id).toArray();
  },
  async remove(id: string): Promise<void> {
    await db.transaction("rw", db.expenses, db.outbox, async () => {
      await db.expenses.delete(id);
      await enqueue({ kind: "expenses.delete", id });
    });
  },
};
