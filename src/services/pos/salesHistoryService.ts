/**
 * Sales history read-model.
 *
 * Reads the authoritative `sales` rows from Supabase for the current pharmacy
 * and resolves product / cashier labels in separate lookups (avoids depending
 * on embedded-relationship naming). All filtering happens server-side except
 * the product-name search, which is resolved to product ids first.
 */
import { supabase } from "@/lib/supabase";
import type { SaleRow } from "@/db/dexie";

export interface SalesHistoryFilters {
  pharmacyId: string;
  from?: string | null; // YYYY-MM-DD
  to?: string | null; // YYYY-MM-DD
  soldBy?: string | null; // pharmacy user id
  search?: string;
  page?: number; // 1-based
  pageSize?: number;
}

export interface SalesHistoryRow {
  id: string;
  transaction_id: string | null;
  sale_date: string;
  created_at: string | null;
  product_id: string;
  product_name: string;
  batch_id: string | null;
  quantity_sold: number;
  cost_price_at_sale: number;
  selling_price_at_sale: number;
  revenue: number;
  profit: number;
  margin: number; // 0..1
  sold_by: string | null;
  cashier_name: string;
}

export interface SalesHistoryTotals {
  revenue: number;
  profit: number;
  items: number;
  transactions: number;
}

export interface SalesHistoryPage {
  rows: SalesHistoryRow[];
  total: number;
  totals: SalesHistoryTotals;
}

export interface Cashier {
  id: string;
  name: string;
  role: string;
}

type RawSale = SaleRow & { sold_by?: string | null };

const TOTALS_CAP = 5000;

export const emptySalesHistoryPage: SalesHistoryPage = {
  rows: [],
  total: 0,
  totals: { revenue: 0, profit: 0, items: 0, transactions: 0 },
};

/** Staff members that can appear in the `sold_by` filter. */
export async function fetchCashiers(pharmacyId: string): Promise<Cashier[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, role")
    .eq("pharmacy_id", pharmacyId)
    .order("first_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => ({
    id: u.id as string,
    name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unnamed",
    role: (u.role as string) ?? "staff",
  }));
}

async function productIdsMatching(term: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .or(`name.ilike.%${term}%,generic_name.ilike.%${term}%`)
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => p.id as string);
}

function baseQuery(f: SalesHistoryFilters, select: string, count?: boolean) {
  let q = count
    ? supabase.from("sales").select(select, { count: "exact" })
    : supabase.from("sales").select(select);
  q = q.eq("pharmacy_id", f.pharmacyId);
  if (f.from) q = q.gte("sale_date", f.from);
  if (f.to) q = q.lte("sale_date", f.to);
  if (f.soldBy) q = q.eq("sold_by", f.soldBy);
  return q;
}

function searchClause(term: string, ids: string[]): string {
  const clauses = [`transaction_id.ilike.%${term}%`];
  if (ids.length > 0) clauses.push(`product_id.in.(${ids.join(",")})`);
  return clauses.join(",");
}

/** One page of sales lines plus totals across the whole filtered set. */
export async function fetchSalesHistory(
  f: SalesHistoryFilters,
): Promise<SalesHistoryPage> {
  if (!f.pharmacyId) return emptySalesHistoryPage;
  const page = Math.max(1, f.page ?? 1);
  const pageSize = f.pageSize ?? 25;
  const fromIdx = (page - 1) * pageSize;
  const term = (f.search ?? "").trim();
  const or = term ? searchClause(term, await productIdsMatching(term)) : null;

  let pageQuery = baseQuery(f, "*", true);
  if (or) pageQuery = pageQuery.or(or);

  const { data, error, count } = await pageQuery
    .order("created_at", { ascending: false })
    .range(fromIdx, fromIdx + pageSize - 1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawSale[];

  // Totals across every matching row (capped for safety).
  let totalsQuery = baseQuery(
    f,
    "transaction_id, quantity_sold, cost_price_at_sale, selling_price_at_sale",
  );
  if (or) totalsQuery = totalsQuery.or(or);
  const { data: allData, error: allErr } = await totalsQuery.limit(TOTALS_CAP);

  if (allErr) throw new Error(allErr.message);
  const all = (allData ?? []) as unknown as RawSale[];

  const txns = new Set<string>();
  let revenue = 0;
  let profit = 0;
  let items = 0;
  for (const s of all) {
    const rev = Number(s.selling_price_at_sale) * s.quantity_sold;
    revenue += rev;
    profit += rev - Number(s.cost_price_at_sale) * s.quantity_sold;
    items += s.quantity_sold;
    if (s.transaction_id) txns.add(s.transaction_id);
  }

  const [products, users] = await Promise.all([
    resolveProducts([...new Set(rows.map((r) => r.product_id))]),
    resolveUsers([...new Set(rows.map((r) => r.sold_by).filter(Boolean) as string[])]),
  ]);

  return {
    rows: rows.map((s) => decorate(s, products, users)),
    total: count ?? rows.length,
    totals: { revenue, profit, items, transactions: txns.size },
  };
}

/** All lines belonging to one transaction (receipt modal). */
export async function fetchTransactionLines(
  pharmacyId: string,
  transactionId: string,
): Promise<SalesHistoryRow[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawSale[];
  const [products, users] = await Promise.all([
    resolveProducts([...new Set(rows.map((r) => r.product_id))]),
    resolveUsers([...new Set(rows.map((r) => r.sold_by).filter(Boolean) as string[])]),
  ]);
  return rows.map((s) => decorate(s, products, users));
}

function decorate(
  s: RawSale,
  products: Map<string, string>,
  users: Map<string, string>,
): SalesHistoryRow {
  const revenue = Number(s.selling_price_at_sale) * s.quantity_sold;
  const cost = Number(s.cost_price_at_sale) * s.quantity_sold;
  return {
    id: s.id,
    transaction_id: s.transaction_id ?? null,
    sale_date: s.sale_date,
    created_at: s.created_at ?? null,
    product_id: s.product_id,
    product_name: products.get(s.product_id) ?? "Unknown product",
    batch_id: s.batch_id ?? null,
    quantity_sold: s.quantity_sold,
    cost_price_at_sale: Number(s.cost_price_at_sale),
    selling_price_at_sale: Number(s.selling_price_at_sale),
    revenue,
    profit: revenue - cost,
    margin: revenue > 0 ? (revenue - cost) / revenue : 0,
    sold_by: s.sold_by ?? null,
    cashier_name: (s.sold_by && users.get(s.sold_by)) || "—",
  };
}

async function resolveProducts(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("products").select("id, name").in("id", ids);
  for (const p of data ?? []) map.set(p.id as string, p.name as string);
  return map;
}

async function resolveUsers(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .in("id", ids);
  for (const u of data ?? []) {
    map.set(
      u.id as string,
      `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unnamed",
    );
  }
  return map;
}
