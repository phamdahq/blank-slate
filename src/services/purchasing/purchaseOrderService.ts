/**
 * Purchase orders + suppliers service.
 *
 * Online-only (procurement is a back-office flow, not a counter flow):
 *   - list / filter purchase orders for the signed-in pharmacy
 *   - create an order header plus its line items
 *   - record payments against the outstanding credit balance
 *   - mark an order "Received", which materialises inventory batches
 *     from the ordered lines (Supabase + local Dexie mirror)
 */
import { supabase } from "@/lib/supabase";
import { db, isBrowser, type Batch } from "@/db/dexie";

export type PurchaseOrderStatus = "Pending" | "Received" | "Cancelled";

export interface Supplier {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  total_price: number;
  batch_number?: string | null;
  expiry_date?: string | null;
  selling_price?: number | null;
}

export interface PurchaseOrder {
  id: string;
  pharmacy_id: string;
  supplier_id: string | null;
  supplier_name_fallback: string | null;
  supplier_name: string;
  order_date: string;
  total_cost: number;
  left_balance: number;
  status: PurchaseOrderStatus;
  notes: string | null;
  created_at: string | null;
}

export interface NewPurchaseOrderLine {
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  batch_number?: string;
  expiry_date?: string;
  selling_price?: number;
}

export interface NewPurchaseOrder {
  pharmacy_id: string;
  supplier_id?: string | null;
  supplier_name_fallback?: string | null;
  order_date: string;
  status?: PurchaseOrderStatus;
  amount_paid?: number;
  notes?: string | null;
  lines: NewPurchaseOrderLine[];
}

function labelFor(
  row: Record<string, unknown>,
  suppliers: Map<string, string>,
): string {
  const id = row["supplier_id"] as string | null;
  return (
    (id ? suppliers.get(id) : null) ??
    (row["supplier_name_fallback"] as string | null) ??
    "Unnamed supplier"
  );
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, city, country")
    .order("name");
  if (error) return [];
  return (data ?? []) as Supplier[];
}

export async function fetchPurchaseOrders(
  pharmacyId: string,
  status: PurchaseOrderStatus | "all" = "all",
  search = "",
): Promise<PurchaseOrder[]> {
  if (!pharmacyId) return [];
  let q = supabase
    .from("purchase_orders")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("order_date", { ascending: false });
  if (status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];

  const supplierIds = [
    ...new Set(rows.map((r) => r["supplier_id"] as string | null).filter(Boolean) as string[]),
  ];
  const suppliers = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: sup } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds);
    for (const s of sup ?? []) suppliers.set(s.id as string, s.name as string);
  }

  const term = search.trim().toLowerCase();
  return rows
    .map((r) => ({
      id: r["id"] as string,
      pharmacy_id: r["pharmacy_id"] as string,
      supplier_id: (r["supplier_id"] as string | null) ?? null,
      supplier_name_fallback: (r["supplier_name_fallback"] as string | null) ?? null,
      supplier_name: labelFor(r, suppliers),
      order_date: r["order_date"] as string,
      total_cost: Number(r["total_cost"] ?? 0),
      left_balance: Number(r["left_balance"] ?? 0),
      status: (r["status"] as PurchaseOrderStatus) ?? "Pending",
      notes: (r["notes"] as string | null) ?? null,
      created_at: (r["created_at"] as string | null) ?? null,
    }))
    .filter(
      (o) =>
        !term ||
        o.supplier_name.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term),
    );
}

export async function fetchOrderItems(orderId: string): Promise<PurchaseOrderItem[]> {
  const { data, error } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", orderId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...(r as unknown as PurchaseOrderItem),
    unit_cost: Number((r as Record<string, unknown>)["unit_cost"] ?? 0),
    total_price: Number((r as Record<string, unknown>)["total_price"] ?? 0),
  }));
}

export function orderTotal(lines: NewPurchaseOrderLine[]): number {
  return lines.reduce((s, l) => s + l.quantity_ordered * l.unit_cost, 0);
}

/**
 * Insert the header, then its items. If the item insert fails the header is
 * rolled back manually so no orphaned order remains.
 */
export async function createPurchaseOrder(input: NewPurchaseOrder): Promise<string> {
  const usable = input.lines.filter((l) => l.product_id && l.quantity_ordered > 0);
  if (usable.length === 0) throw new Error("Add at least one line item.");

  const total = orderTotal(usable);
  const paid = Math.min(Math.max(input.amount_paid ?? 0, 0), total);

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      pharmacy_id: input.pharmacy_id,
      supplier_id: input.supplier_id ?? null,
      supplier_name_fallback: input.supplier_id ? null : input.supplier_name_fallback ?? null,
      order_date: input.order_date,
      total_cost: total,
      left_balance: total - paid,
      status: input.status ?? "Pending",
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const orderId = (data as { id: string }).id;

  const { error: itemErr } = await supabase.from("purchase_order_items").insert(
    usable.map((l) => ({
      purchase_order_id: orderId,
      product_id: l.product_id,
      quantity_ordered: l.quantity_ordered,
      unit_cost: l.unit_cost,
      total_price: l.quantity_ordered * l.unit_cost,
      batch_number: l.batch_number ?? null,
      expiry_date: l.expiry_date ?? null,
      selling_price: l.selling_price ?? null,
    })),
  );
  if (itemErr) {
    await supabase.from("purchase_orders").delete().eq("id", orderId);
    throw new Error(itemErr.message);
  }
  return orderId;
}

/** Apply a payment to the outstanding credit balance. */
export async function recordPayment(orderId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error("Enter an amount greater than zero.");
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("left_balance")
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);
  const next = Math.max(0, Number((data as { left_balance: number }).left_balance) - amount);
  const { error: updErr } = await supabase
    .from("purchase_orders")
    .update({ left_balance: next })
    .eq("id", orderId);
  if (updErr) throw new Error(updErr.message);
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "Cancelled" })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

/**
 * Mark an order received: creates one inventory batch per line item, then
 * flips the status. Batches are mirrored into Dexie so POS/Inventory light up
 * immediately.
 */
export async function markReceived(order: PurchaseOrder): Promise<void> {
  const items = await fetchOrderItems(order.id);
  if (items.length === 0) throw new Error("This order has no line items.");

  const today = new Date().toISOString().slice(0, 10);
  const batches = items.map<Batch>((it) => ({
    id: crypto.randomUUID(),
    pharmacy_id: order.pharmacy_id,
    product_id: it.product_id,
    batch_number: it.batch_number || `PO-${order.id.slice(0, 8).toUpperCase()}`,
    supplier_name: order.supplier_name,
    expiry_date: it.expiry_date || today,
    quantity: it.quantity_ordered,
    purchase_cost: it.unit_cost,
    selling_price: Number(it.selling_price ?? it.unit_cost),
  }));

  const { data, error } = await supabase.from("batches").insert(batches).select();
  if (error) throw new Error(error.message);

  const { error: updErr } = await supabase
    .from("purchase_orders")
    .update({ status: "Received" })
    .eq("id", order.id);
  if (updErr) throw new Error(updErr.message);

  if (isBrowser) {
    await db.batches.bulkPut(((data ?? batches) as Batch[]).map((b) => b));
  }
}
