/**
 * Incoming purchase orders for the signed-in supplier.
 *
 * Reads `pharmacies_purchase_orders` (rows addressed to this supplier via RLS)
 * and their line items from `pharmacy_purchase_order_items`.
 */
import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/supplier-format";

export interface SupplierOrder {
  id: string;
  pharmacy_id: string | null;
  pharmacy_name: string;
  order_date: string;
  total_cost: number;
  left_balance: number;
  status: OrderStatus;
}

export interface SupplierOrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  batch_number: string;
  quantity: number;
  unit_cost: number;
  total_price: number;
}

export interface OrderFilters {
  status?: OrderStatus | "all";
  from?: string;
  to?: string;
  search?: string;
}

interface RawOrder extends Record<string, unknown> {
  pharmacies?: { name?: string } | null;
}

function mapOrder(row: RawOrder): SupplierOrder {
  return {
    id: row["id"] as string,
    pharmacy_id: (row["pharmacy_id"] as string | null) ?? null,
    pharmacy_name: row.pharmacies?.name ?? "Unknown pharmacy",
    order_date: (row["order_date"] as string) ?? "",
    total_cost: Number(row["total_cost"] ?? 0),
    left_balance: Number(row["left_balance"] ?? 0),
    status: ((row["status"] as OrderStatus) ?? "Pending") as OrderStatus,
  };
}

export async function fetchIncomingOrders(
  supplierId: string,
  filters: OrderFilters = {},
): Promise<SupplierOrder[]> {
  let q = supabase
    .from("pharmacies_purchase_orders")
    .select(
      "id, pharmacy_id, order_date, total_cost, left_balance, status, pharmacies(name)",
    )
    .eq("supplier_id", supplierId)
    .order("order_date", { ascending: false });

  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.from) q = q.gte("order_date", filters.from);
  if (filters.to) q = q.lte("order_date", filters.to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as RawOrder[]).map(mapOrder);
  const term = (filters.search ?? "").trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((o) => `${o.id} ${o.pharmacy_name}`.toLowerCase().includes(term));
}

export async function fetchOrderItems(orderId: string): Promise<SupplierOrderItem[]> {
  const { data, error } = await supabase
    .from("pharmacy_purchase_order_items")
    .select(
      "id, product_id, batch_number, quantity_ordered, unit_cost, total_price, products(name, strength, dosage_form)",
    )
    .eq("purchase_order_id", orderId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const p = r["products"] as
      | { name?: string; strength?: string | null; dosage_form?: string | null }
      | null;
    const label = [p?.name, p?.strength, p?.dosage_form].filter(Boolean).join(" ");
    return {
      id: r["id"] as string,
      product_id: (r["product_id"] as string | null) ?? null,
      product_name: label || "Unknown product",
      batch_number: (r["batch_number"] as string | null) ?? "—",
      quantity: Number(r["quantity_ordered"] ?? 0),
      unit_cost: Number(r["unit_cost"] ?? 0),
      total_price: Number(r["total_price"] ?? 0),
    };
  });
}

/** Move an order along its lifecycle. Returns the persisted row. */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<SupplierOrder> {
  const { data, error } = await supabase
    .from("pharmacies_purchase_orders")
    .update({ status })
    .eq("id", orderId)
    .select("id, pharmacy_id, order_date, total_cost, left_balance, status, pharmacies(name)")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Order could not be updated — you may not have access to it.");
  return mapOrder(data as RawOrder);
}
