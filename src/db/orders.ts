/**
 * Local, offline-first order queue for the POS.
 *
 * When "Order mode" is enabled by the pharmacy owner, POS checkout creates a
 * pending order instead of committing a sale immediately. A cashier pays the
 * order from the Orders tab, which then runs the normal offline-first
 * checkout (Dexie + outbox sync).
 */
import { db, isBrowser, type OrderItem, type OrderRow, type OrderStatus } from "./dexie";
import { salesRepo } from "./repositories";

export type { OrderItem, OrderRow, OrderStatus };

const FLAG_KEY = (pharmacyId: string) => `orders_enabled:${pharmacyId}`;

export const orderSettingsRepo = {
  async isEnabled(pharmacyId: string | null | undefined): Promise<boolean> {
    if (!isBrowser || !pharmacyId) return false;
    const row = await db.meta.get(FLAG_KEY(pharmacyId));
    return row?.value === true;
  },
  async setEnabled(pharmacyId: string, enabled: boolean): Promise<void> {
    await db.meta.put({ key: FLAG_KEY(pharmacyId), value: enabled });
  },
};

export const ordersRepo = {
  list(pharmacyId: string) {
    return db.orders.where("pharmacy_id").equals(pharmacyId).toArray();
  },

  async create(pharmacyId: string, items: OrderItem[]): Promise<OrderRow> {
    if (items.length === 0) throw new Error("Cart is empty");
    const last = await db.orders.where("pharmacy_id").equals(pharmacyId).toArray();
    const order_no = last.reduce((m, o) => Math.max(m, o.order_no), 100) + 1;
    const row: OrderRow = {
      id: crypto.randomUUID(),
      pharmacy_id: pharmacyId,
      order_no,
      items,
      total: items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
      status: "pending",
      created_at: new Date().toISOString(),
    };
    await db.orders.put(row);
    return row;
  },

  async cancel(id: string): Promise<void> {
    await db.orders.update(id, { status: "cancelled" as OrderStatus });
  },

  async remove(id: string): Promise<void> {
    await db.orders.delete(id);
  },

  /** Charge a pending order: commits the sale locally and queues sync. */
  async pay(id: string): Promise<void> {
    const order = await db.orders.get(id);
    if (!order || order.status !== "pending") return;
    const result = await salesRepo.checkout(
      order.pharmacy_id,
      order.items.map((i) => ({
        product_id: i.product_id,
        batch_id: i.batch_id,
        quantity: i.quantity,
        selling_price: i.unit_price,
      })),
    );
    await db.orders.update(id, {
      status: "completed" as OrderStatus,
      transaction_id: result.transaction_id,
    });
  },
};
