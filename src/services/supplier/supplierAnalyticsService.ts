/**
 * Supplier analytics: dashboard metrics, sales history and reports.
 *
 * A "sale" for a supplier is a purchase order the pharmacy has confirmed as
 * `Received`. Everything below aggregates real rows from
 * `pharmacies_purchase_orders`, `pharmacy_purchase_order_items` and
 * `supplier_batches` — there is no cached or synthetic data.
 */
import { supabase } from "@/lib/supabase";
import { LOW_STOCK_THRESHOLD } from "@/lib/supplier-format";
import type { OrderStatus } from "@/lib/supplier-format";

export interface SupplierSale {
  id: string;
  pharmacy_id: string | null;
  pharmacy_name: string;
  date: string;
  items_sold: number;
  total_amount: number;
  left_balance: number;
}

export interface MonthPoint {
  month: string;
  revenue: number;
}

export interface DashboardData {
  revenue: number;
  pendingOrders: number;
  lowStock: number;
  activePartners: number;
  monthly: MonthPoint[];
  recent: Array<{
    id: string;
    pharmacy_name: string;
    order_date: string;
    total_cost: number;
    status: OrderStatus;
  }>;
}

interface RawOrder extends Record<string, unknown> {
  pharmacies?: { name?: string } | null;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const idx = Number(key.slice(5, 7)) - 1;
  return MONTH_LABELS[idx] ?? key;
}

async function fetchOrders(supplierId: string): Promise<RawOrder[]> {
  const { data, error } = await supabase
    .from("pharmacies_purchase_orders")
    .select("id, pharmacy_id, order_date, total_cost, left_balance, status, pharmacies(name)")
    .eq("supplier_id", supplierId)
    .order("order_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RawOrder[];
}

export async function loadDashboard(supplierId: string): Promise<DashboardData> {
  const [orders, batchesRes] = await Promise.all([
    fetchOrders(supplierId),
    supabase.from("supplier_batches").select("quantity").eq("supplier_id", supplierId),
  ]);
  if (batchesRes.error) throw new Error(batchesRes.error.message);

  const received = orders.filter((o) => o["status"] === "Received");
  const revenue = received.reduce((s, o) => s + Number(o["total_cost"] ?? 0), 0);
  const pendingOrders = orders.filter((o) => o["status"] === "Pending").length;
  const lowStock = ((batchesRes.data ?? []) as { quantity: number }[]).filter(
    (b) => Number(b.quantity ?? 0) <= LOW_STOCK_THRESHOLD,
  ).length;
  const activePartners = new Set(
    orders
      .filter((o) => o["status"] !== "Cancelled")
      .map((o) => o["pharmacy_id"] as string | null)
      .filter(Boolean),
  ).size;

  // Last six calendar months of received revenue.
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const o of received) {
    const k = monthKey((o["order_date"] as string) ?? "");
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + Number(o["total_cost"] ?? 0));
  }

  return {
    revenue,
    pendingOrders,
    lowStock,
    activePartners,
    monthly: keys.map((k) => ({ month: monthLabel(k), revenue: totals.get(k) ?? 0 })),
    recent: orders.slice(0, 5).map((o) => ({
      id: o["id"] as string,
      pharmacy_name: o.pharmacies?.name ?? "Unknown pharmacy",
      order_date: (o["order_date"] as string) ?? "",
      total_cost: Number(o["total_cost"] ?? 0),
      status: ((o["status"] as OrderStatus) ?? "Pending") as OrderStatus,
    })),
  };
}

export interface SalesFilters {
  pharmacy?: string;
  from?: string;
  to?: string;
}

/** Completed (Received) orders with their real line-item unit counts. */
export async function fetchSalesHistory(
  supplierId: string,
  filters: SalesFilters = {},
): Promise<SupplierSale[]> {
  let q = supabase
    .from("pharmacies_purchase_orders")
    .select(
      "id, pharmacy_id, order_date, total_cost, left_balance, status, pharmacies(name), pharmacy_purchase_order_items(quantity_ordered)",
    )
    .eq("supplier_id", supplierId)
    .eq("status", "Received")
    .order("order_date", { ascending: false });

  if (filters.from) q = q.gte("order_date", filters.from);
  if (filters.to) q = q.lte("order_date", filters.to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as RawOrder[]).map((o) => {
    const items = (o["pharmacy_purchase_order_items"] as { quantity_ordered: number }[]) ?? [];
    return {
      id: o["id"] as string,
      pharmacy_id: (o["pharmacy_id"] as string | null) ?? null,
      pharmacy_name: o.pharmacies?.name ?? "Unknown pharmacy",
      date: (o["order_date"] as string) ?? "",
      items_sold: items.reduce((s, i) => s + Number(i.quantity_ordered ?? 0), 0),
      total_amount: Number(o["total_cost"] ?? 0),
      left_balance: Number(o["left_balance"] ?? 0),
    };
  });

  if (filters.pharmacy && filters.pharmacy !== "all") {
    return rows.filter((r) => r.pharmacy_name === filters.pharmacy);
  }
  return rows;
}

/** Distinct pharmacies this supplier has traded with. */
export async function fetchPharmacyPartners(supplierId: string): Promise<string[]> {
  const orders = await fetchOrders(supplierId);
  return [...new Set(orders.map((o) => o.pharmacies?.name).filter(Boolean) as string[])].sort();
}

export interface ReportsData {
  monthly: MonthPoint[];
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  byPharmacy: Array<{ name: string; revenue: number }>;
  sales: SupplierSale[];
  totalRevenue: number;
  outstanding: number;
}

export async function loadReports(
  supplierId: string,
  from?: string,
  to?: string,
): Promise<ReportsData> {
  const sales = await fetchSalesHistory(supplierId, { from: from ?? "", to: to ?? "" });
  const orderIds = sales.map((s) => s.id);

  let topProducts: ReportsData["topProducts"] = [];
  if (orderIds.length > 0) {
    const { data, error } = await supabase
      .from("pharmacy_purchase_order_items")
      .select(
        "purchase_order_id, quantity_ordered, total_price, products(name, strength, dosage_form)",
      )
      .in("purchase_order_id", orderIds);
    if (error) throw new Error(error.message);

    const agg = new Map<string, { units: number; revenue: number }>();
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      const p = r["products"] as Record<string, string> | null;
      const name =
        [p?.["name"], p?.["strength"], p?.["dosage_form"]].filter(Boolean).join(" ") ||
        "Unknown product";
      const prev = agg.get(name) ?? { units: 0, revenue: 0 };
      agg.set(name, {
        units: prev.units + Number(r["quantity_ordered"] ?? 0),
        revenue: prev.revenue + Number(r["total_price"] ?? 0),
      });
    }
    topProducts = [...agg.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  const byPharmacyMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  for (const s of sales) {
    byPharmacyMap.set(s.pharmacy_name, (byPharmacyMap.get(s.pharmacy_name) ?? 0) + s.total_amount);
    const k = monthKey(s.date);
    if (k) monthMap.set(k, (monthMap.get(k) ?? 0) + s.total_amount);
  }

  return {
    monthly: [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, revenue]) => ({ month: monthLabel(k), revenue })),
    topProducts,
    byPharmacy: [...byPharmacyMap.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    sales,
    totalRevenue: sales.reduce((s, r) => s + r.total_amount, 0),
    outstanding: sales.reduce((s, r) => s + r.left_balance, 0),
  };
}
