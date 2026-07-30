/**
 * Dashboard read-model.
 *
 * Every figure on the dashboard is derived from the local Dexie mirror
 * (sales, batches, expenses, pharmacy settings), so the dashboard is exact
 * and fully functional offline. Supabase changes flow in through the
 * realtime/pull layer and reshape Dexie, which re-triggers these queries.
 */
import { db, isBrowser, type Batch } from "@/db/dexie";
import { DEFAULT_SETTINGS } from "@/db/pharmacy-config";
import { LOW_STOCK_LEVEL } from "@/lib/catalog";

export type DashboardRange = "today" | "week" | "month" | "year";

export interface RangeWindow {
  /** Inclusive ISO start date (YYYY-MM-DD). */
  start: string;
  /** Inclusive ISO end date (YYYY-MM-DD). */
  end: string;
  label: string;
}

const DAY = 86_400_000;

function iso(d: Date): string {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return tz.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // Monday-first
  copy.setDate(copy.getDate() - dow);
  return copy;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmt(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${String(d).padStart(2, "0")}, ${y}`;
}

/** Resolve a range id into a concrete inclusive date window. */
export function resolveRange(range: DashboardRange, now = new Date()): RangeWindow {
  const today = iso(now);
  switch (range) {
    case "today":
      return { start: today, end: today, label: `Today · ${fmt(today)}` };
    case "week": {
      const s = iso(startOfWeek(now));
      return { start: s, end: today, label: `${fmt(s)} – ${fmt(today)}` };
    }
    case "month": {
      const s = iso(new Date(now.getFullYear(), now.getMonth(), 1));
      return { start: s, end: today, label: `${fmt(s)} – ${fmt(today)}` };
    }
    case "year":
    default: {
      const s = iso(new Date(now.getFullYear(), 0, 1));
      return { start: s, end: today, label: `${now.getFullYear()} · Year to date` };
    }
  }
}

/** Previous window of equal length, used for period-over-period deltas. */
function previousWindow(win: RangeWindow): RangeWindow {
  const start = new Date(`${win.start}T00:00:00`).getTime();
  const end = new Date(`${win.end}T00:00:00`).getTime();
  const span = end - start + DAY;
  return {
    start: iso(new Date(start - span)),
    end: iso(new Date(start - DAY)),
    label: "previous period",
  };
}

function inRange(date: string, win: RangeWindow): boolean {
  return date >= win.start && date <= win.end;
}

export interface FinancialTotals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  /** Gross margin as a fraction of revenue (0 when no revenue). */
  margin: number;
  /** Revenue change vs. the previous window, as a fraction (null if no base). */
  revenueChange: number | null;
  previousRevenue: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  stock: number;
  reorderLevel: number;
}

export interface ExpiringItem {
  batchId: string;
  productId: string;
  name: string;
  batchNumber: string;
  expiry: string;
  daysLeft: number;
  quantity: number;
}

export interface DashboardData {
  window: RangeWindow;
  financials: FinancialTotals;
  trend: TrendPoint[];
  cashInDrawer: number;
  cashCollectedToday: number;
  cashPaidOutToday: number;
  lowStock: LowStockItem[];
  expiring: ExpiringItem[];
  expireLevel: number;
  transactions: number;
}

function bucketKey(date: string, range: DashboardRange): string {
  if (range === "year") return date.slice(0, 7); // YYYY-MM
  return date;
}

function bucketLabel(key: string, range: DashboardRange): string {
  if (range === "year") {
    const [, m] = key.split("-").map(Number);
    return MONTHS[(m ?? 1) - 1];
  }
  const [, m, d] = key.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${String(d).padStart(2, "0")}`;
}

/**
 * Compute every dashboard metric for a pharmacy and date range.
 * Pure read — safe to call from a live query on any Dexie write.
 */
export async function loadDashboard(
  pharmacyId: string | null | undefined,
  range: DashboardRange,
  now = new Date(),
): Promise<DashboardData> {
  const win = resolveRange(range, now);
  const prev = previousWindow(win);
  const today = iso(now);

  const empty: DashboardData = {
    window: win,
    financials: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      margin: 0,
      revenueChange: null,
      previousRevenue: 0,
    },
    trend: [],
    cashInDrawer: 0,
    cashCollectedToday: 0,
    cashPaidOutToday: 0,
    lowStock: [],
    expiring: [],
    expireLevel: DEFAULT_SETTINGS.expire_level,
    transactions: 0,
  };
  if (!isBrowser || !pharmacyId) return empty;

  const [sales, expenses, batches, settings] = await Promise.all([
    db.sales.where("pharmacy_id").equals(pharmacyId).toArray(),
    db.expenses.where("pharmacy_id").equals(pharmacyId).toArray(),
    db.batches.where("pharmacy_id").equals(pharmacyId).toArray(),
    db.pharmacy_settings.get(pharmacyId),
  ]);

  // ---- Financials ----
  let revenue = 0;
  let cogs = 0;
  let previousRevenue = 0;
  let cashCollectedToday = 0;
  const txns = new Set<string>();
  const buckets = new Map<string, number>();

  for (const s of sales) {
    const line = s.quantity_sold * s.selling_price_at_sale;
    if (inRange(s.sale_date, win)) {
      revenue += line;
      cogs += s.quantity_sold * s.cost_price_at_sale;
      txns.add(s.transaction_id ?? s.id);
      const key = bucketKey(s.sale_date, range);
      buckets.set(key, (buckets.get(key) ?? 0) + line);
    } else if (inRange(s.sale_date, prev)) {
      previousRevenue += line;
    }
    if (s.sale_date === today) cashCollectedToday += line;
  }

  let operatingExpenses = 0;
  let cashPaidOutToday = 0;
  for (const e of expenses) {
    if (inRange(e.date, win)) operatingExpenses += e.amount;
    if (e.date === today) cashPaidOutToday += e.amount;
  }

  const grossProfit = revenue - cogs;
  const financials: FinancialTotals = {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit: grossProfit - operatingExpenses,
    margin: revenue > 0 ? grossProfit / revenue : 0,
    revenueChange:
      previousRevenue > 0 ? (revenue - previousRevenue) / previousRevenue : null,
    previousRevenue,
  };

  // ---- Trend series (every bucket in the window, zero-filled) ----
  const trend: TrendPoint[] = [];
  if (range === "year") {
    const year = now.getFullYear();
    for (let m = 0; m <= now.getMonth(); m += 1) {
      const key = `${year}-${String(m + 1).padStart(2, "0")}`;
      trend.push({ date: bucketLabel(key, range), value: buckets.get(key) ?? 0 });
    }
  } else {
    const startMs = new Date(`${win.start}T00:00:00`).getTime();
    const endMs = new Date(`${win.end}T00:00:00`).getTime();
    for (let t = startMs; t <= endMs; t += DAY) {
      const key = iso(new Date(t));
      trend.push({ date: bucketLabel(key, range), value: buckets.get(key) ?? 0 });
    }
  }

  // ---- Inventory alerts ----
  const expireLevel = settings?.expire_level ?? DEFAULT_SETTINGS.expire_level;
  const byProduct = new Map<string, Batch[]>();
  for (const b of batches) {
    const list = byProduct.get(b.product_id) ?? [];
    list.push(b);
    byProduct.set(b.product_id, list);
  }
  const productIds = [...byProduct.keys()];
  const products = await db.products.bulkGet(productIds);
  const nameOf = new Map<string, string>();
  products.forEach((p, i) => nameOf.set(productIds[i], p?.name ?? "Unknown product"));

  const lowStock: LowStockItem[] = [];
  for (const [productId, rows] of byProduct) {
    const stock = rows.reduce((s, b) => s + b.quantity, 0);
    if (stock <= LOW_STOCK_LEVEL) {
      lowStock.push({
        productId,
        name: nameOf.get(productId) ?? "Unknown product",
        stock,
        reorderLevel: LOW_STOCK_LEVEL,
      });
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);

  const expiring: ExpiringItem[] = batches
    .filter((b) => b.quantity > 0)
    .map((b) => ({
      batchId: b.id,
      productId: b.product_id,
      name: nameOf.get(b.product_id) ?? "Unknown product",
      batchNumber: b.batch_number,
      expiry: b.expiry_date,
      quantity: b.quantity,
      daysLeft: Math.ceil(
        (new Date(`${b.expiry_date}T00:00:00`).getTime() - now.getTime()) / DAY,
      ),
    }))
    .filter((b) => b.daysLeft <= expireLevel)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    window: win,
    financials,
    trend,
    cashInDrawer: cashCollectedToday - cashPaidOutToday,
    cashCollectedToday,
    cashPaidOutToday,
    lowStock,
    expiring,
    expireLevel,
    transactions: txns.size,
  };
}
