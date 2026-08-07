import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  AlertTriangle,
  CalendarX,
  ArrowRight,
  Calendar,
  Briefcase,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RequireRole } from "@/components/require-role";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { useDashboard } from "@/hooks/use-dashboard";
import type { DashboardRange } from "@/services/dashboardService";

export const Route = createFileRoute("/(pharmacy)/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · PharmaCore" },
      {
        name: "description",
        content:
          "Daily financial performance, operational cash, and inventory alerts for your pharmacy.",
      },
      { property: "og:title", content: "Dashboard · PharmaCore" },
      {
        property: "og:description",
        content: "Action-first pharmacy dashboard with revenue, profit, and critical alerts.",
      },
    ],
  }),
  component: DashboardPage,
});

const ranges: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

const money = (n: number) =>
  `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

function DashboardPage() {
  return (
    <RequireRole roles={["owner", "pharmacist", "cashier"]}>
      <DashboardPageView />
    </RequireRole>
  );
}

function DashboardPageView() {
  const { pharmacyId } = useSession();
  const [range, setRange] = useState<DashboardRange>("month");
  const [custom, setCustom] = useState(() => ({ from: todayIso(), to: todayIso() }));
  const data = useDashboard(pharmacyId, range, range === "custom" ? custom : null);
  const { financials: f, trend } = data;
  const avg = trend.length
    ? Math.round(trend.reduce((s, p) => s + p.value, 0) / trend.length)
    : 0;
  const change = f.revenueChange;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              Financial Reports
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.window.label} · {data.transactions.toLocaleString()} transactions
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <RangeTabs value={range} onChange={setRange} />
            {range === "custom" && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-elev-sm">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={custom.from}
                    max={custom.to}
                    onChange={(e) =>
                      setCustom((c) => ({ ...c, from: e.target.value || c.from }))
                    }
                    className="rounded-md border border-border bg-surface-low px-2 py-1 font-mono-data text-xs text-foreground outline-none focus:border-primary"
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
                    className="rounded-md border border-border bg-surface-low px-2 py-1 font-mono-data text-xs text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}
          </div>
        </div>


        {/* Financial performance */}
        <SectionHeader title="Financial Performance" right={data.window.label} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Revenue (Net, Excl. VAT)"
            value={money(f.revenue)}
            hint={
              f.previousRevenue > 0
                ? `vs. ${money(f.previousRevenue)} previous period`
                : "No comparable previous period"
            }
            badge={
              change === null
                ? undefined
                : {
                    tone: change >= 0 ? "success" : "danger",
                    label: `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`,
                    icon:
                      change >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ),
                  }
            }
          />
          <KpiCard
            label="COGS"
            value={money(f.cogs)}
            hint={`Cost of goods sold · Margin ${(f.margin * 100).toFixed(1)}%`}
          />
          <KpiCard
            label="Gross Profit"
            value={money(f.grossProfit)}
            hint="Total Revenue − COGS"
          />
          <KpiCard
            variant="primary"
            label="Net Profit (After Expenses)"
            value={money(f.netProfit)}
            hint={`Gross Profit − ${money(f.operatingExpenses)} expenses`}
            icon={<Wallet className="h-5 w-5" />}
          />
        </div>

        {/* Operational cash */}
        <SectionHeader title="Operational Cash" right="Live register state" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OpCard
            icon={<Receipt className="h-4 w-4" />}
            label="Cash in Drawer"
            value={money(data.cashInDrawer)}
            hint={`${money(data.cashCollectedToday)} collected − ${money(
              data.cashPaidOutToday,
            )} paid out · Today`}
          />
          <OpCard
            icon={<Briefcase className="h-4 w-4" />}
            label="Operating Expenses"
            value={money(f.operatingExpenses)}
            hint={`All logged expenses · ${data.window.label}`}
          />
          <AlertCard
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Low Stock Alerts"
            value={`${data.lowStock.length} ${data.lowStock.length === 1 ? "Item" : "Items"}`}
            status={data.lowStock.length ? "Requires Action" : "All levels healthy"}
            detail={data.lowStock
              .slice(0, 3)
              .map((i) => `${i.name} · ${i.stock} left`)
              .join(" · ")}
            to="/inventory"
            cta="View all inventory"
          />
          <AlertCard
            tone="danger"
            icon={<CalendarX className="h-4 w-4" />}
            label="Expiring Soon"
            value={`${data.expiring.length} ${data.expiring.length === 1 ? "Batch" : "Batches"}`}
            status={
              data.expiring.length
                ? "Critical"
                : `Nothing within ${data.expireLevel} days`
            }
            detail={data.expiring
              .slice(0, 3)
              .map((b) => `${b.name} · ${b.daysLeft}d`)
              .join(" · ")}
            to="/inventory"
            cta="Run disposal report"
          />
        </div>

        {/* Revenue trend */}
        <SectionHeader title="Revenue Trend" right={data.window.label} />
        <div className="mt-3 rounded-xl border border-border bg-surface p-4 shadow-elev-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-mono-data">{data.window.label}</span>
            </div>
            <div className="rounded-full bg-primary-soft px-3 py-1 font-mono-data text-[11px] font-semibold text-primary-soft-foreground">
              Avg: {avg.toLocaleString()} ETB/{range === "year" ? "mo" : "day"}
            </div>
          </div>
          <div className="h-[280px] w-full sm:h-[340px]">
            {trend.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No sales recorded in this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [money(v), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#revFill)"
                    dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function RangeTabs({
  value,
  onChange,
}: {
  value: DashboardRange;
  onChange: (r: DashboardRange) => void;
}) {

  return (
    <div className="inline-flex w-full items-center rounded-full border border-border bg-surface p-1 shadow-elev-sm sm:w-auto">
      {ranges.map((r) => {
        const active = r.id === value;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:flex-none sm:text-sm",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.id === "custom" ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                {r.label}
                <Calendar className="h-3.5 w-3.5" />
              </span>
            ) : (
              r.label
            )}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <div className="mt-8 flex items-end justify-between gap-3">
      <h2 className="font-mono-data text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
        {title}
      </h2>
      {right && (
        <span className="font-mono-data text-[11px] text-subtle-foreground">{right}</span>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  badge,
  variant = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  badge?: { tone: "success" | "danger"; label: string; icon?: React.ReactNode };
  variant?: "default" | "primary";
  icon?: React.ReactNode;
}) {
  const isPrimary = variant === "primary";
  return (
    <div
      className={cn(
        "relative rounded-xl border p-5 shadow-elev-sm transition-shadow",
        isPrimary
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "text-[13px] font-medium leading-snug",
            isPrimary ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {label}
        </div>
        {badge && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono-data text-[11px] font-bold",
              badge.tone === "danger"
                ? "bg-danger-soft text-danger-soft-foreground"
                : "bg-success-soft text-success-soft-foreground",
            )}
          >
            {badge.icon}
            {badge.label}
          </span>
        )}
        {isPrimary && icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-4 font-mono-data text-[34px] font-bold leading-none tracking-tight tabular-nums",
          isPrimary ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-3 text-xs",
            isPrimary ? "text-primary-foreground/85 font-medium" : "text-subtle-foreground",
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function OpCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-low p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-5 font-mono-data text-[28px] font-bold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-3 text-xs text-subtle-foreground">{hint}</div>
    </div>
  );
}

function AlertCard({
  tone,
  icon,
  label,
  value,
  status,
  detail,
  cta,
  to,
}: {
  tone: "warning" | "danger";
  icon: React.ReactNode;
  label: string;
  value: string;
  status: string;
  detail?: string;
  cta: string;
  to: "/inventory";
}) {
  const isDanger = tone === "danger";
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-low p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md",
            isDanger
              ? "bg-danger-soft text-danger-soft-foreground"
              : "bg-warning-soft text-warning-soft-foreground",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-5 font-mono-data text-[28px] font-bold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div
        className={cn(
          "mt-2 text-xs font-semibold",
          isDanger ? "text-danger" : "text-warning-soft-foreground",
        )}
      >
        {status}
      </div>
      {detail && (
        <div className="mt-2 line-clamp-2 text-[11px] text-subtle-foreground">{detail}</div>
      )}

      <div className="mt-3 border-t border-border/70 pt-3">
        <Link
          to={to}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
            isDanger
              ? "text-danger hover:text-danger/80"
              : "text-warning-soft-foreground hover:opacity-80",
          )}
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
