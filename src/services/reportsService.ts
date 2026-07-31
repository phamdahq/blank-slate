/**
 * Reports read-model.
 *
 * Every figure on the Reports page is derived from the local Dexie mirror
 * (sales, batches, expenses, products), which is kept in step with Supabase by
 * the realtime/pull layer. No mock data, fully offline-capable.
 */
import { db, isBrowser, type Batch, type Product } from "@/db/dexie";
import { resolveRange, type CustomRange, type DashboardRange, type RangeWindow } from "@/services/dashboardService";

export type { CustomRange, RangeWindow };
export type ReportRange = Extract<DashboardRange, "week" | "month" | "year" | "custom">;

const DAY = 86_400_000;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function iso(d: Date): string {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return tz.toISOString().slice(0, 10);
}

function label(key: string, monthly: boolean): string {
  const [, m, d] = key.split("-").map(Number);
  if (monthly) return MONTHS[(m ?? 1) - 1];
  return `${MONTHS[(m ?? 1) - 1]} ${String(d).padStart(2, "0")}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  pharmaceutical: "Pharmaceutical",
  cosmetic: "Cosmetic",
  medical_device: "Medical device",
  supplies: "Supplies",
  other: "Uncategorised",
};

const CATEGORY_COLORS: Record<string, string> = {
  pharmaceutical: "#2563eb",
  cosmetic: "#10b981",
  medical_device: "#b45309",
  supplies: "#7c3aed",
  other: "#64748b",
};

export interface CategorySlice {
  name: string;
  value: number;
  amount: number;
  color: string;
}

export interface TrendRow {
  day: string;
  revenue: number;
  gross: number;
  net: number;
}

export interface SalesIntelligenceData {
  window: RangeWindow;
  /** Current sell-through value of everything on the shelf. */
  stockSellValue: number;
  /** Current acquisition cost of everything on the shelf. */
  stockCostValue: number;
  /** Cost value as a share of sell value (0..1). */
  costRatio: number;
  /** Annualised COGS / average inventory cost value. */
  turnover: number;
  /** Cost value of batches expired or expiring inside the window. */
  wasteValue: number;
  wasteItems: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  expenses: number;
  margin: number;
  transactions: number;
  valuationByCategory: CategorySlice[];
  profitByCategory: CategorySlice[];
  trend: TrendRow[];
}

export function emptySalesIntelligence(
  range: ReportRange,
  now = new Date(),
  custom?: CustomRange | null,
): SalesIntelligenceData {
  return {
    window: resolveRange(range, now, custom),
    stockSellValue: 0,
    stockCostValue: 0,
    costRatio: 0,
    turnover: 0,
    wasteValue: 0,
    wasteItems: 0,
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    netProfit: 0,
    expenses: 0,
    margin: 0,
    transactions: 0,
    valuationByCategory: [],
    profitByCategory: [],
    trend: [],
  };
}

function categoryOf(p: Product | undefined): string {
  const c = (p?.category as string | undefined) ?? "other";
  return CATEGORY_LABELS[c] ? c : "other";
}

function toSlices(totals: Map<string, number>): CategorySlice[] {
  const sum = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .filter(([, v]) => v > 0)
    .map(([key, amount]) => ({
      name: CATEGORY_LABELS[key] ?? CATEGORY_LABELS.other,
      amount,
      value: sum > 0 ? Math.round((amount / sum) * 100) : 0,
      color: CATEGORY_COLORS[key] ?? CATEGORY_COLORS.other,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Compute every Sales Intelligence figure for a pharmacy + date window. */
export async function loadSalesIntelligence(
  pharmacyId: string | null | undefined,
  range: ReportRange,
  now = new Date(),
  custom?: CustomRange | null,
): Promise<SalesIntelligenceData> {
  const win = resolveRange(range, now, custom);
  if (!isBrowser || !pharmacyId) return emptySalesIntelligence(range, now, custom);

  const [sales, batches, expenses] = await Promise.all([
    db.sales.where("pharmacy_id").equals(pharmacyId).toArray(),
    db.batches.where("pharmacy_id").equals(pharmacyId).toArray(),
    db.expenses.where("pharmacy_id").equals(pharmacyId).toArray(),
  ]);

  const productIds = [
    ...new Set([...batches.map((b) => b.product_id), ...sales.map((s) => s.product_id)]),
  ];
  const products = await db.products.bulkGet(productIds);
  const productById = new Map<string, Product | undefined>();
  products.forEach((p, i) => productById.set(productIds[i], p));

  // ---- Current inventory valuation ----
  let stockSellValue = 0;
  let stockCostValue = 0;
  const valuation = new Map<string, number>();
  let wasteValue = 0;
  let wasteItems = 0;

  const windowEndMs = new Date(`${win.end}T00:00:00`).getTime();

  for (const b of batches as Batch[]) {
    if (b.quantity <= 0) continue;
    const sell = b.quantity * b.selling_price;
    const cost = b.quantity * b.purchase_cost;
    stockSellValue += sell;
    stockCostValue += cost;
    const key = categoryOf(productById.get(b.product_id));
    valuation.set(key, (valuation.get(key) ?? 0) + sell);

    const expiryMs = new Date(`${b.expiry_date}T00:00:00`).getTime();
    if (!Number.isNaN(expiryMs) && expiryMs <= windowEndMs) {
      wasteValue += cost;
      wasteItems += 1;
    }
  }

  // ---- Sales inside the window ----
  let revenue = 0;
  let cogs = 0;
  const txns = new Set<string>();
  const profitByCat = new Map<string, number>();
  const revenueBuckets = new Map<string, number>();
  const grossBuckets = new Map<string, number>();
  const monthly = range === "year";

  for (const s of sales) {
    if (s.sale_date < win.start || s.sale_date > win.end) continue;
    const line = s.quantity_sold * s.selling_price_at_sale;
    const lineCost = s.quantity_sold * s.cost_price_at_sale;
    revenue += line;
    cogs += lineCost;
    txns.add(s.transaction_id ?? s.id);

    const key = categoryOf(productById.get(s.product_id));
    profitByCat.set(key, (profitByCat.get(key) ?? 0) + (line - lineCost));

    const bucket = monthly ? s.sale_date.slice(0, 7) : s.sale_date;
    revenueBuckets.set(bucket, (revenueBuckets.get(bucket) ?? 0) + line);
    grossBuckets.set(bucket, (grossBuckets.get(bucket) ?? 0) + (line - lineCost));
  }

  // ---- Expenses inside the window ----
  let totalExpenses = 0;
  const expenseBuckets = new Map<string, number>();
  for (const e of expenses) {
    if (e.date < win.start || e.date > win.end) continue;
    totalExpenses += e.amount;
    const bucket = monthly ? e.date.slice(0, 7) : e.date;
    expenseBuckets.set(bucket, (expenseBuckets.get(bucket) ?? 0) + e.amount);
  }

  // ---- Trend series, zero filled ----
  const trend: TrendRow[] = [];
  const pushBucket = (key: string) => {
    const rev = revenueBuckets.get(key) ?? 0;
    const gross = grossBuckets.get(key) ?? 0;
    trend.push({
      day: label(monthly ? `${key}-01` : key, monthly),
      revenue: rev,
      gross,
      net: gross - (expenseBuckets.get(key) ?? 0),
    });
  };

  if (monthly) {
    const startYear = Number(win.start.slice(0, 4));
    const startMonth = Number(win.start.slice(5, 7));
    const endMonth = Number(win.end.slice(5, 7));
    for (let m = startMonth; m <= endMonth; m += 1) {
      pushBucket(`${startYear}-${String(m).padStart(2, "0")}`);
    }
  } else {
    const startMs = new Date(`${win.start}T00:00:00`).getTime();
    const endMs = windowEndMs;
    for (let t = startMs; t <= endMs; t += DAY) pushBucket(iso(new Date(t)));
  }

  const grossProfit = revenue - cogs;
  const days = Math.max(1, Math.round((windowEndMs - new Date(`${win.start}T00:00:00`).getTime()) / DAY) + 1);
  const turnover = stockCostValue > 0 ? (cogs / days) * 365 / stockCostValue : 0;

  return {
    window: win,
    stockSellValue,
    stockCostValue,
    costRatio: stockSellValue > 0 ? stockCostValue / stockSellValue : 0,
    turnover,
    wasteValue,
    wasteItems,
    revenue,
    cogs,
    grossProfit,
    netProfit: grossProfit - totalExpenses,
    expenses: totalExpenses,
    margin: revenue > 0 ? grossProfit / revenue : 0,
    transactions: txns.size,
    valuationByCategory: toSlices(valuation),
    profitByCategory: toSlices(profitByCat),
    trend,
  };
}

export interface ProductVelocity {
  productId: string;
  units: number;
  revenue: number;
  cost: number;
  lastSaleDate: string | null;
}

/** Per-product sales aggregates restricted to a window (for best sellers). */
export async function loadVelocity(
  pharmacyId: string | null | undefined,
  range: ReportRange,
  now = new Date(),
  custom?: CustomRange | null,
): Promise<Map<string, ProductVelocity>> {
  const map = new Map<string, ProductVelocity>();
  if (!isBrowser || !pharmacyId) return map;
  const win = resolveRange(range, now, custom);
  const sales = await db.sales.where("pharmacy_id").equals(pharmacyId).toArray();
  for (const s of sales) {
    if (s.sale_date < win.start || s.sale_date > win.end) continue;
    const row =
      map.get(s.product_id) ??
      { productId: s.product_id, units: 0, revenue: 0, cost: 0, lastSaleDate: null };
    row.units += s.quantity_sold;
    row.revenue += s.quantity_sold * s.selling_price_at_sale;
    row.cost += s.quantity_sold * s.cost_price_at_sale;
    if (!row.lastSaleDate || s.sale_date > row.lastSaleDate) row.lastSaleDate = s.sale_date;
    map.set(s.product_id, row);
  }
  return map;
}
