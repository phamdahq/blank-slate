import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet,
  RefreshCw,
  Trash2,
  FileText,
  TrendingUp,
  Calendar,
  Receipt,
  CreditCard,
  Plus,
  MoreVertical,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { RequireRole } from "@/components/require-role";
import { AppShell } from "@/components/app-shell";
import { stockStatus, useCatalog, type Medication } from "@/lib/catalog";
import {
  daysUntilDate,
  useInventoryRules,
  useSalesStats,
} from "@/lib/inventory-health";
import { useSession } from "@/hooks/use-session";
import { useExpenses } from "@/hooks/use-expenses";
import { useSalesIntelligence, useVelocity } from "@/hooks/use-reports";
import type { CustomRange } from "@/services/reportsService";
import { resolveRange } from "@/services/dashboardService";
import * as expenseService from "@/services/expenseService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Financials · PharmaCore" },
      {
        name: "description",
        content:
          "Monitor clinical performance and fiscal health of your pharmacy in real time.",
      },
    ],
  }),
  component: ReportsPage,
});

type TopTab = "sales" | "inventory" | "financials";
type RangeKey = "week" | "month" | "year" | "custom";

function ReportsPage() {
  return (
    <RequireRole roles={["owner", "pharmacist"]}>
      <ReportsPageView />
    </RequireRole>
  );
}

function ReportsPageView() {
  const [tab, setTab] = useState<TopTab>("sales");
  const [range, setRange] = useState<RangeKey>("month");
  const today = new Date().toISOString().slice(0, 10);
  const [custom, setCustom] = useState<CustomRange>({ from: today, to: today });

  const customRange = range === "custom" ? custom : null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              Reports &amp; Financials
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor clinical performance and fiscal health in real-time.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <RangeSwitcher value={range} onChange={setRange} />
            {range === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={custom.from}
                    max={custom.to}
                    onChange={(e) =>
                      setCustom((c) => ({ ...c, from: e.target.value || c.from }))
                    }
                    className="h-8 rounded-md border border-border bg-surface px-2 font-mono-data text-xs text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={custom.to}
                    min={custom.from}
                    onChange={(e) =>
                      setCustom((c) => ({ ...c, to: e.target.value || c.to }))
                    }
                    className="h-8 rounded-md border border-border bg-surface px-2 font-mono-data text-xs text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Top tabs */}
        <div className="mt-6 border-b border-border">
          <div className="-mx-4 flex gap-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TopTabBtn active={tab === "sales"} onClick={() => setTab("sales")}>
              Sales Intelligence
            </TopTabBtn>
            <TopTabBtn
              active={tab === "inventory"}
              onClick={() => setTab("inventory")}
            >
              Inventory Health
            </TopTabBtn>
            <TopTabBtn
              active={tab === "financials"}
              onClick={() => setTab("financials")}
            >
              Financials &amp; Expense Log
            </TopTabBtn>
          </div>
        </div>

        <div className="mt-6">
          {tab === "sales" && <SalesIntelligence range={range} custom={customRange} />}
          {tab === "inventory" && <InventoryHealth range={range} custom={customRange} />}
          {tab === "financials" && <FinancialsLog range={range} custom={customRange} />}
        </div>
      </div>
    </AppShell>
  );
}


/* ----------------------- shared ----------------------- */

function TopTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative -mb-px shrink-0 py-3 text-sm font-semibold transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

function RangeSwitcher({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
}) {
  const opts: { key: RangeKey; label: string; icon?: typeof Calendar }[] = [
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
    { key: "custom", label: "Custom", icon: Calendar },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-full border border-border bg-surface p-1 shadow-elev-sm">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {Icon && <Icon className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  tone,
  iconTone = "primary",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: typeof Wallet;
  delta?: { value: string; positive?: boolean };
  tone?: "danger" | "success";
  iconTone?: "primary" | "success" | "danger" | "muted";
}) {
  const iconClasses: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-secondary-soft text-secondary-soft-foreground",
    danger: "bg-danger-soft text-danger",
    muted: "bg-surface-mid text-muted-foreground",
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
          {label}
        </div>
        <div
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md",
            iconClasses[iconTone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div
          className={cn(
            "text-3xl font-bold tracking-tight",
            tone === "danger" && "text-danger",
            tone === "success" && "text-secondary-soft-foreground",
          )}
        >
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "font-mono-data text-xs font-semibold",
              delta.positive ? "text-secondary-soft-foreground" : "text-danger",
            )}
          >
            {delta.positive ? "↗" : "↘"} {delta.value}
          </span>
        )}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ----------------------- Sales Intelligence ----------------------- */

const compactMoney = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
};

function SalesIntelligence({
  range,
  custom,
}: {
  range: RangeKey;
  custom: CustomRange | null;
}) {
  const { pharmacyId } = useSession();
  const data = useSalesIntelligence(pharmacyId, range, custom);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Stock Value"
          value={compactMoney(data.stockSellValue)}
          icon={Wallet}
          hint={
            <>
              Total Sell Value
              <div className="mt-2 border-t border-border pt-2">
                Purchase Value:{" "}
                <span className="font-mono-data text-foreground">
                  {compactMoney(data.stockCostValue)}
                </span>{" "}
                <span className="font-mono-data text-secondary-soft-foreground">
                  {(data.costRatio * 100).toFixed(1)}%
                </span>
              </div>
            </>
          }
        />
        <KpiCard
          label="Stock Turnover Rate"
          value={`${data.turnover.toFixed(1)}x`}
          icon={RefreshCw}
          hint={
            <>
              <span className="font-mono-data text-primary">
                ANNUALISED FROM {data.window.label}
              </span>
              <div className="mt-1">
                COGS {compactMoney(data.cogs)} · Stock {compactMoney(data.stockCostValue)}
              </div>
            </>
          }
        />
        <KpiCard
          label="Waste/Expiry Value"
          value={compactMoney(data.wasteValue)}
          icon={Trash2}
          iconTone="danger"
          hint={
            <>
              <span className="font-mono-data text-danger">
                {data.wasteItems} BATCHES FLAGGED
              </span>
              <div className="mt-1">Expired on or before {data.window.end}</div>
            </>
          }
        />
        <KpiCard
          label="COGS"
          value={compactMoney(data.cogs)}
          icon={FileText}
          iconTone="muted"
          hint={
            <>
              Cost of goods sold · {data.transactions} transactions
              <div className="mt-1">Margin {(data.margin * 100).toFixed(1)}%</div>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutCard
          title="Valuation by Category"
          subtitle="Current stock at sell value"
          centerLabel="TOTAL"
          centerValue={compactMoney(data.stockSellValue)}
          data={data.valuationByCategory}
          suffix="%"
        />
        <DonutCard
          title="Profit Percentage by Category"
          subtitle={data.window.label}
          centerLabel="GROSS PROFIT"
          centerValue={compactMoney(data.grossProfit)}
          data={data.profitByCategory}
          suffix="%"
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Profit Performance Trend</h2>
            <p className="text-sm text-muted-foreground">
              Revenue, gross and net profit · {data.window.label}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Net profit
            </div>
            <div
              className={cn(
                "text-xl font-bold",
                data.netProfit < 0 ? "text-danger" : "text-foreground",
              )}
            >
              {compactMoney(data.netProfit)}
            </div>
          </div>
        </div>
        <div className="mt-4 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="gross" name="Gross Profit" stroke="#0ea5a4" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="net" name="Net Profit" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


function DonutCard({
  title,
  subtitle,
  centerLabel,
  centerValue,
  data,
  suffix,
}: {
  title: string;
  subtitle?: string;
  centerLabel: string;
  centerValue: string;
  data: { name: string; value: number; color: string }[];

  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {data.length === 0 && (
        <p className="mt-8 pb-8 text-center text-sm text-muted-foreground">
          No data for this period.
        </p>
      )}
      <div
        className={cn(
          "mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
          data.length === 0 && "hidden",
        )}
      >

        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-2xl font-bold tracking-tight">{centerValue}</div>
              <div className="font-mono-data text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
                {centerLabel}
              </div>
            </div>
          </div>
        </div>
        <ul className="space-y-3 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: d.color }}
              />
              <span className="flex-1 text-muted-foreground">{d.name}</span>
              <span className="font-mono-data font-semibold text-foreground">
                {d.value}
                {suffix}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------- Inventory Health ----------------------- */

type SubTab = "restock" | "expiry" | "stagnant" | "best";

function InventoryHealth({
  range,
  custom,
}: {
  range: RangeKey;
  custom: CustomRange | null;
}) {

  const [sub, setSub] = useState<SubTab>("restock");
  const [order, setOrder] = useState<string[]>([]);

  const toggleOrder = (id: string) =>
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex items-center gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <SubTabBtn active={sub === "restock"} onClick={() => setSub("restock")}>
          Restock (Low Stock)
        </SubTabBtn>
        <SubTabBtn active={sub === "expiry"} onClick={() => setSub("expiry")}>
          Expiry (Expiring Soon)
        </SubTabBtn>
        <SubTabBtn active={sub === "stagnant"} onClick={() => setSub("stagnant")}>
          Stagnant (Deadstock)
        </SubTabBtn>
        <SubTabBtn active={sub === "best"} onClick={() => setSub("best")}>
          Best-Sellers (Top Velocity)
        </SubTabBtn>
        {sub === "restock" && order.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 font-mono-data text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" />
            {order.length} on purchase list
          </span>
        )}
      </div>

      {sub === "restock" && <RestockTable order={order} onToggle={toggleOrder} />}
      {sub === "expiry" && <ExpiryTable />}
      {sub === "stagnant" && <StagnantTable />}
      {sub === "best" && <BestSellersTable range={range} custom={custom} />}
    </div>
  );
}

function SubTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative -mb-px shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

function TableShell({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-elev-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-low font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              {head}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const Th = ({ children, align }: { children?: React.ReactNode; align?: "right" | "center" }) => (
  <th className={cn("px-5 py-3", align === "right" && "text-right", align === "center" && "text-center", !align && "text-left")}>
    {children}
  </th>
);
const Td = ({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" | "center" }) => (
  <td className={cn("px-5 py-4", align === "right" && "text-right", align === "center" && "text-center", className)}>
    {children}
  </td>
);

/* ---- Restock (low stock) ---- */
function RestockTable({
  order,
  onToggle,
}: {
  order: string[];
  onToggle: (id: string) => void;
}) {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  const rows = useMemo(
    () =>
      medications
        .filter((m) => {
          const s = stockStatus(m);
          return s === "critical" || s === "low";
        })
        .sort((a, b) => a.stock - b.stock),
    [medications],
  );

  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th align="right">Current Stock</Th>
          <Th align="right">Safety Level</Th>
          <Th align="right">Last Purchase Price</Th>
          <Th align="right">Action</Th>
        </>
      }
    >
      {rows.map((m) => {
        const critical = m.stock === 0 || stockStatus(m) === "critical";
        const inOrder = order.includes(m.id);
        const lastCost = m.batches.length
          ? m.batches[m.batches.length - 1].cost
          : 0;
        return (
          <tr
            key={m.id}
            className={cn(
              "border-t border-border transition-colors",
              critical
                ? "bg-danger-soft/50"
                : "bg-warning-soft/40 hover:bg-warning-soft/60",
            )}
          >
            <Td>
              <div className="font-semibold text-foreground">
                {m.name} {m.strength}
              </div>
              <div className="text-xs text-muted-foreground">{m.form}</div>
            </Td>
            <Td align="right">
              <span
                className={cn(
                  "font-mono-data text-base font-bold",
                  critical ? "text-danger" : "text-warning-soft-foreground",
                )}
              >
                {m.stock} Units
              </span>
            </Td>
            <Td align="right" className="font-mono-data text-muted-foreground">
              {m.reorderLevel} Units
            </Td>
            <Td align="right" className="font-mono-data text-foreground">
              ${lastCost.toFixed(2)}
            </Td>
            <Td align="right">
              <button
                type="button"
                onClick={() => onToggle(m.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                  inOrder
                    ? "bg-secondary-soft text-secondary-soft-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary-hover",
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                {inOrder ? "Added" : "Add to Order"}
              </button>
            </Td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
            All stock levels are healthy.
          </td>
        </tr>
      )}
    </TableShell>
  );
}

/* ---- Expiry risk ---- */
function ExpiryTable() {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  const { expireLevel } = useInventoryRules(pharmacyId);

  type Row = {
    med: Medication;
    batchNumber: string;
    batchId: string;
    qty: number;
    expiry: string;
    days: number;
  };
  const rows = useMemo<Row[]>(() => {
    const acc: Row[] = [];
    for (const m of medications) {
      for (const b of m.batches) {
        if (b.quantity <= 0) continue;
        const days = daysUntilDate(b.expiry);
        if (days <= expireLevel) {
          acc.push({
            med: m,
            batchNumber: b.batch_number,
            batchId: b.id,
            qty: b.quantity,
            expiry: b.expiry,
            days,
          });
        }
      }
    }
    return acc.sort((a, b) => a.days - b.days);
  }, [medications, expireLevel]);

  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th>Expiry Date</Th>
          <Th align="right">Remaining Life</Th>
          <Th align="right">Quantity</Th>
          <Th align="right">Value at Risk</Th>
        </>
      }
    >
      {rows.map((r) => {
        const expired = r.days <= 0;
        const critical = r.days > 0 && r.days <= Math.max(7, expireLevel / 3);
        return (
          <tr
            key={`${r.med.id}-${r.batchId}`}
            className={cn(
              "border-t border-border",
              expired
                ? "bg-danger-soft/50"
                : critical
                  ? "bg-warning-soft/40"
                  : "hover:bg-surface-low",
            )}
          >
            <Td>
              <div className="font-semibold text-foreground">
                {r.med.name} {r.med.strength}
              </div>
              <div className="font-mono-data text-xs text-muted-foreground">
                Batch {r.batchNumber}
              </div>
            </Td>
            <Td className="font-mono-data text-foreground">{r.expiry}</Td>
            <Td align="right">
              <span
                className={cn(
                  "font-mono-data font-semibold",
                  expired
                    ? "text-danger"
                    : critical
                      ? "text-warning-soft-foreground"
                      : "text-foreground",
                )}
              >
                {expired ? "Expired" : `${r.days} Days`}
              </span>
            </Td>
            <Td align="right" className="font-mono-data font-semibold text-foreground">
              {r.qty.toLocaleString()} Units
            </Td>
            <Td align="right" className="font-mono-data text-foreground">
              $
              {(r.qty * (r.med.batches.find((b) => b.id === r.batchId)?.cost ?? 0)).toLocaleString(
                undefined,
                { maximumFractionDigits: 0 },
              )}
            </Td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
            No batches expiring within the {expireLevel}-day alert window.
          </td>
        </tr>
      )}
    </TableShell>
  );
}

/* ---- Stagnant (dead stock) ---- */
function StagnantTable() {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  const { deadstock } = useInventoryRules(pharmacyId);
  const stats = useSalesStats(pharmacyId);

  const rows = useMemo(
    () =>
      medications
        .filter((m) => m.stock > 0)
        .map((m) => {
          const s = stats.get(m.id);
          const unitCost = m.batches.length
            ? m.batches.reduce((sum, b) => sum + b.cost, 0) / m.batches.length
            : 0;
          return {
            med: m,
            lastSold: s?.daysSinceLastSale ?? null,
            lastSaleDate: s?.lastSaleDate ?? null,
            unitCost,
          };
        })
        .filter((r) => r.lastSold === null || r.lastSold >= deadstock)
        .sort((a, b) => (b.lastSold ?? Infinity) - (a.lastSold ?? Infinity)),
    [medications, stats, deadstock],
  );

  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th align="right">Last Sale</Th>
          <Th align="right">Quantity</Th>
          <Th align="right">Inventory Value</Th>
          <Th align="right">Status</Th>
        </>
      }
    >
      {rows.map((r) => (
        <tr key={r.med.id} className="border-t border-border hover:bg-surface-low">
          <Td>
            <div className="font-semibold text-foreground">
              {r.med.name} {r.med.strength}
            </div>
            <div className="text-xs text-muted-foreground">{r.med.form}</div>
          </Td>
          <Td align="right" className="font-mono-data text-muted-foreground">
            {r.lastSold === null ? "Never sold" : `${r.lastSold} Days ago`}
            {r.lastSaleDate && (
              <div className="text-[11px] text-subtle-foreground">{r.lastSaleDate}</div>
            )}
          </Td>
          <Td align="right" className="font-mono-data text-foreground">
            {r.med.stock.toLocaleString()} Units
          </Td>
          <Td align="right" className="font-mono-data font-semibold text-foreground">
            ${(r.med.stock * r.unitCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Td>
          <Td align="right">
            <span className="inline-flex h-7 items-center rounded-full bg-warning-soft px-2.5 font-mono-data text-xs font-semibold text-warning-soft-foreground">
              Dead stock
            </span>
          </Td>
        </tr>
      ))}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
            No item has been idle for {deadstock}+ days.
          </td>
        </tr>
      )}
    </TableShell>
  );
}

/* ---- Best sellers ---- */
function BestSellersTable({
  range,
  custom,
}: {
  range: RangeKey;
  custom: CustomRange | null;
}) {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  const stats = useSalesStats(pharmacyId);
  const velocity = useVelocity(pharmacyId, range, custom);

  const rows = useMemo(
    () =>
      medications
        .map((m) => {
          const v = velocity.get(m.id);
          const s = stats.get(m.id);
          const prev = s?.unitsPrev30 ?? 0;
          const curr = s?.units30 ?? 0;
          const growth =
            prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
          return { med: m, units: v?.units ?? 0, revenue: v?.revenue ?? 0, growth };
        })
        .filter((r) => r.units > 0)
        .sort((a, b) => b.units - a.units)
        .slice(0, 10),
    [medications, velocity, stats],
  );


  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th align="right">Units Sold</Th>
          <Th align="right">Total Revenue</Th>
          <Th align="right">Stock Level</Th>
          <Th align="right">Growth Trend (30d)</Th>
        </>
      }
    >
      {rows.map((r) => {
        const low = stockStatus(r.med) === "critical" || stockStatus(r.med) === "low";
        return (
          <tr key={r.med.id} className="border-t border-border hover:bg-surface-low">
            <Td>
              <div className="font-semibold text-foreground">
                {r.med.name} {r.med.strength}
              </div>
              <div className="text-xs text-muted-foreground">{r.med.form}</div>
            </Td>
            <Td align="right" className="font-mono-data text-foreground">
              {r.units.toLocaleString()} Units
            </Td>
            <Td align="right" className="font-mono-data font-semibold text-primary">
              ${r.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Td>
            <Td align="right">
              <span
                className={cn(
                  "font-mono-data font-semibold",
                  low ? "text-danger" : "text-foreground",
                )}
              >
                {r.med.stock.toLocaleString()} Units
              </span>
            </Td>
            <Td align="right">
              <span
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 font-mono-data text-xs font-semibold",
                  r.growth >= 0
                    ? "bg-secondary-soft text-secondary-soft-foreground"
                    : "bg-danger-soft text-danger",
                )}
              >
                <TrendingUp
                  className={cn("h-3.5 w-3.5", r.growth < 0 && "rotate-180")}
                />
                {r.growth >= 0 ? "+" : ""}
                {r.growth}%
              </span>
            </Td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
            No sales recorded yet.
          </td>
        </tr>
      )}
    </TableShell>
  );
}

/* ----------------------- Financials & Expense Log ----------------------- */

type ExpenseType = "Recurring" | "One-time";

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const prettyDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
};

function FinancialsLog({
  range,
  custom,
}: {
  range: RangeKey;
  custom: CustomRange | null;
}) {
  const { pharmacyId } = useSession();
  const expenses = useExpenses(pharmacyId);
  const financials = useSalesIntelligence(pharmacyId, range, custom);
  const [form, setForm] = useState({
    name: "",
    date: "",
    type: "Recurring" as ExpenseType,
    amount: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const upcoming = useMemo(() => expenseService.upcomingRecurring(expenses), [expenses]);

  const win = useMemo(
    () => resolveRange(range, new Date(), custom),
    [range, custom?.from, custom?.to],
  );

  const rangeTotals = useMemo(
    () => expenseService.totalsInRange(expenses, win.start, win.end),
    [expenses, win.start, win.end],
  );


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      await expenseService.logExpense({
        pharmacyId: pharmacyId ?? "",
        name: form.name,
        type: form.type,
        amount: Number(form.amount),
        date: form.date || undefined,
      });
      setForm({ name: "", date: "", type: "Recurring", amount: "" });
      toast.success("Expense logged", { description: "Saved locally and syncing." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save the expense.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (row: (typeof upcoming)[number]) => {
    try {
      await expenseService.markRecurringPaid(row.source);
      toast.success(`${row.name} marked paid`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the payment.");
    }
  };

  const removeSeries = async (row: (typeof upcoming)[number]) => {
    setMenuFor(null);
    try {
      await expenseService.deleteRecurringSeries(pharmacyId ?? "", row.name);
      toast.success(`${row.name} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the expense.");
    }
  };


  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={`Revenue · ${win.label}`} value={money(financials.revenue)} />
        <StatCard label="Gross profit" value={money(financials.grossProfit)} />
        <StatCard label="Net profit" value={money(financials.netProfit)} />
        <StatCard label="Expenses in range" value={money(rangeTotals.total)} />
        <StatCard label="Recurring in range" value={money(rangeTotals.recurring)} />
        <StatCard label="One-time in range" value={money(rangeTotals.oneTime)} />
      </div>


      <div className="max-w-md">
        <form
          onSubmit={submit}
          className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm"
        >
          <h3 className="text-lg font-semibold">Log Expense</h3>
          <div className="mt-4 space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Expense Name (e.g. Electricity Bill)"
              className="h-11 w-full rounded-md border border-border bg-surface-low px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="h-11 w-full rounded-md border border-border bg-surface-low px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ExpenseType }))}
                className="h-11 w-full rounded-md border border-border bg-surface-low px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option>Recurring</option>
                <option>One-time</option>
              </select>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="h-11 w-full rounded-md border border-border bg-surface-low pl-7 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            {error && <p className="text-xs font-medium text-danger">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Saving…" : "Confirm Entry"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-elev-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Upcoming Recurring Expenses</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-surface-low font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              <Th>Expense Name</Th>
              <Th>Next Due Date</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((u) => {
              const isPaid = u.source.date > expenseService.todayIso();
              return (
                <tr key={u.id} className="border-t border-border">
                  <Td className="font-medium text-foreground">{u.name}</Td>
                  <Td className="font-mono-data text-muted-foreground">
                    {prettyDate(isPaid ? u.source.date : u.dueDate)}
                  </Td>
                  <Td align="right" className="font-mono-data font-semibold text-foreground">
                    {money(u.amount)}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-2">
                      {isPaid ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
                          Paid
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void markPaid(u)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Mark Paid
                        </button>
                      )}
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="More actions"
                          onClick={() => setMenuFor((m) => (m === u.id ? null : u.id))}
                          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-low hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuFor === u.id && (
                          <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border border-border bg-surface text-left shadow-elev-md">
                            <button
                              type="button"
                              onClick={() => void removeSeries(u)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  No recurring expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-elev-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Expense Log · {win.label}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-surface-low font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                <Th>Date</Th>
                <Th>Expense Name</Th>
                <Th>Type</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {rangeTotals.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <Td className="font-mono-data text-muted-foreground">{prettyDate(row.date)}</Td>
                  <Td className="font-medium text-foreground">{row.name}</Td>
                  <Td className="text-muted-foreground">{row.type}</Td>
                  <Td align="right" className="font-mono-data font-semibold text-foreground">
                    {money(row.amount)}
                  </Td>
                </tr>
              ))}
              {rangeTotals.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    No expenses recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono-data text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
