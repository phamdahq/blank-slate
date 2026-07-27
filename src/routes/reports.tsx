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
import { useSession } from "@/hooks/use-session";
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
          <RangeSwitcher value={range} onChange={setRange} />
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
          {tab === "sales" && <SalesIntelligence />}
          {tab === "inventory" && <InventoryHealth />}
          {tab === "financials" && <FinancialsLog />}
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

const trendData = [
  { day: "Mon", revenue: 6200, gross: 3800, net: 2400 },
  { day: "Tue", revenue: 4800, gross: 2900, net: 1800 },
  { day: "Wed", revenue: 6800, gross: 4300, net: 2600 },
  { day: "Thu", revenue: 5200, gross: 3400, net: 2100 },
  { day: "Fri", revenue: 7400, gross: 4900, net: 3000 },
  { day: "Sat", revenue: 2100, gross: 1300, net: 500 },
  { day: "Sun", revenue: 3600, gross: 2200, net: 1200 },
];

const valuationData = [
  { name: "Prescription", value: 65, color: "#2563eb" },
  { name: "OTC Medicine", value: 22, color: "#10b981" },
  { name: "Medical Equipment", value: 13, color: "#b45309" },
];
const profitData = [
  { name: "Prescription", value: 42, color: "#2563eb" },
  { name: "OTC Medicine", value: 35, color: "#10b981" },
  { name: "Medical Equipment", value: 23, color: "#b45309" },
];

function SalesIntelligence() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Stock Value"
          value="$248.5k"
          icon={Wallet}
          delta={{ value: "4.1%", positive: true }}
          hint={
            <>
              Total Sell Value
              <div className="mt-2 border-t border-border pt-2">
                Purchase Value:{" "}
                <span className="font-mono-data text-foreground">$165.2k</span>{" "}
                <span className="font-mono-data text-secondary-soft-foreground">
                  66.5%
                </span>
              </div>
            </>
          }
        />
        <KpiCard
          label="Stock Turnover Rate"
          value="8.4x"
          icon={RefreshCw}
          delta={{ value: "12%", positive: true }}
          hint={
            <>
              <span className="font-mono-data text-primary">
                EFFICIENCY SCORE: HIGH
              </span>
              <div className="mt-1">Industry Avg: 6.2x</div>
            </>
          }
        />
        <KpiCard
          label="Waste/Expiry Value"
          value="$1,402"
          icon={Trash2}
          iconTone="danger"
          delta={{ value: "8%", positive: false }}
          hint={
            <>
              <span className="font-mono-data text-danger">34 ITEMS FLAGGED</span>
              <div className="mt-1">Current Month Projection</div>
            </>
          }
        />
        <KpiCard
          label="COGS"
          value="$96,954"
          icon={FileText}
          iconTone="muted"
          hint={
            <>
              Inventory Investment
              <div className="mt-1">Est. Margin 68%</div>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutCard title="Valuation by Category" centerLabel="TOTAL" centerValue="$248k" data={valuationData} suffix="%" />
        <DonutCard title="Profit Percentage by Category" subtitle="This Week" centerLabel="PROFIT" centerValue="100%" data={profitData} suffix="%" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Profit Performance Trend</h2>
            <p className="text-sm text-muted-foreground">
              Comparative analysis of revenue and profitability (Last 7 Days)
            </p>
          </div>
        </div>
        <div className="mt-4 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
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
      <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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

function InventoryHealth() {
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
      {sub === "best" && <BestSellersTable />}
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

/* ---- Restock ---- */
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
    [],
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
              ${(m.price * 0.6).toFixed(2)}
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

/* ---- Expiry ---- */
function daysUntil(expiryYm: string): number {
  const [y, m] = expiryYm.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + 1, 0); // last day of expiry month
  const now = new Date();
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryTable() {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  type Row = { med: Medication; batchId: string; qty: number; expiry: string; days: number };
  const rows = useMemo<Row[]>(() => {
    const acc: Row[] = [];
    for (const m of medications) {
      for (const b of m.batches) {
        const days = daysUntil(b.expiry);
        if (days <= 365) {
          acc.push({ med: m, batchId: b.id, qty: b.quantity, expiry: b.expiry, days });
        }
      }
    }
    return acc.sort((a, b) => a.days - b.days);
  }, []);

  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th>Expiry Date</Th>
          <Th align="right">Remaining Life</Th>
          <Th align="right">Quantity</Th>
          <Th align="right">Action</Th>
        </>
      }
    >
      {rows.map((r) => {
        const expired = r.days <= 0;
        const critical = r.days > 0 && r.days < 30;
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
                Batch {r.batchId}
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
            <Td align="right">
              {expired ? (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-danger px-3 text-xs font-semibold text-danger-foreground hover:bg-danger/90"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Dispose
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Sale
                </button>
              )}
            </Td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
            No batches expiring in the next year.
          </td>
        </tr>
      )}
    </TableShell>
  );
}

/* ---- Stagnant ---- */
function StagnantTable() {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  // Fabricated last-sold days & unit cost per medication for demo
  const rows = useMemo(
    () =>
      medications
        .map((m, i) => ({
          med: m,
          lastSold: 60 + ((i * 17) % 180),
          unitCost: +(m.price * 0.6).toFixed(2),
        }))
        .filter((r) => r.lastSold >= 90)
        .sort((a, b) => b.lastSold - a.lastSold),
    [],
  );

  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th align="right">Last Sale Date</Th>
          <Th align="right">Quantity</Th>
          <Th align="right">Inventory Value</Th>
          <Th align="right">Action</Th>
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
            {r.lastSold} Days ago
          </Td>
          <Td align="right" className="font-mono-data text-foreground">
            {r.med.stock.toLocaleString()} Units
          </Td>
          <Td align="right" className="font-mono-data font-semibold text-foreground">
            ${(r.med.stock * r.unitCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Td>
          <Td align="right">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Sale
            </button>
          </Td>
        </tr>
      ))}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
            No stagnant items.
          </td>
        </tr>
      )}
    </TableShell>
  );
}

/* ---- Best sellers ---- */
function BestSellersTable() {
  const { pharmacyId } = useSession();
  const medications = useCatalog(pharmacyId);
  const rows = useMemo(
    () =>
      medications
        .map((m, i) => {
          const units = 300 + ((i * 137) % 1500);
          const growth = ((i * 7) % 30) - 10; // -10..+19
          return {
            med: m,
            units,
            revenue: +(units * m.price).toFixed(0),
            growth,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
    [],
  );

  return (
    <TableShell
      head={
        <>
          <Th>Item Name</Th>
          <Th align="right">Units Sold (MTD)</Th>
          <Th align="right">Total Revenue</Th>
          <Th align="right">Stock Level</Th>
          <Th align="right">Growth Trend</Th>
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
              ${r.revenue.toLocaleString()}
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
    </TableShell>
  );
}

/* ----------------------- Financials & Expense Log ----------------------- */

type ExpenseType = "Recurring" | "One-time";


const upcoming = [
  { name: "City Utilities", date: "Apr 18, 2024", amount: 450 },
  { name: "Admin Staff", date: "Apr 12, 2024", amount: 4100 },
  { name: "Realty Group", date: "Apr 05, 2024", amount: 3000 },
];

function FinancialsLog() {
  const [form, setForm] = useState({
    name: "",
    date: "",
    type: "Recurring" as ExpenseType,
    amount: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    setForm({ name: "", date: "", type: "Recurring", amount: "" });
  };


  return (
    <div className="space-y-6">
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
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Confirm Entry
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
            {upcoming.map((u) => (
              <tr key={u.name} className="border-t border-border">
                <Td className="font-medium text-foreground">{u.name}</Td>
                <Td className="font-mono-data text-muted-foreground">{u.date}</Td>
                <Td align="right" className="font-mono-data font-semibold text-foreground">
                  ${u.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Td>
                <Td align="right">
                  <button className="text-xs font-semibold text-primary hover:underline">
                    Mark Paid
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
