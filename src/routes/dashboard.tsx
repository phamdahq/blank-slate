import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp,
  Wallet,
  Receipt,
  AlertTriangle,
  CalendarX,
  ArrowRight,
  Calendar,
  FileText,
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

export const Route = createFileRoute("/dashboard")({
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

type Range = "today" | "week" | "month" | "custom";

const ranges: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

const revenueByRange: Record<Range, { date: string; value: number }[]> = {
  today: [
    { date: "06a", value: 1200 },
    { date: "09a", value: 3800 },
    { date: "12p", value: 6400 },
    { date: "03p", value: 5100 },
    { date: "06p", value: 7200 },
    { date: "09p", value: 4300 },
  ],
  week: [
    { date: "Mon", value: 18400 },
    { date: "Tue", value: 21200 },
    { date: "Wed", value: 17800 },
    { date: "Thu", value: 24300 },
    { date: "Fri", value: 29800 },
    { date: "Sat", value: 31600 },
    { date: "Sun", value: 19500 },
  ],
  month: [
    { date: "Oct 08", value: 48200 },
    { date: "Oct 09", value: 72100 },
    { date: "Oct 10", value: 31400 },
    { date: "Oct 11", value: 89800 },
    { date: "Oct 12", value: 53600 },
    { date: "Oct 13", value: 42100 },
    { date: "Oct 14", value: 112800 },
  ],
  custom: [
    { date: "Sep 25", value: 39400 },
    { date: "Sep 30", value: 58200 },
    { date: "Oct 05", value: 71200 },
    { date: "Oct 10", value: 31400 },
    { date: "Oct 14", value: 112800 },
  ],
};

const rangeLabel: Record<Range, string> = {
  today: "Today · Hourly",
  week: "Last 7 days",
  month: "Oct 08 – Oct 14",
  custom: "Sep 25 – Oct 14",
};

function DashboardPage() {
  return (
    <RequireRole roles={["owner", "pharmacist", "cashier"]}>
      <DashboardPageView />
    </RequireRole>
  );
}

function DashboardPageView() {
  const [range, setRange] = useState<Range>("month");
  const series = revenueByRange[range];
  const avg = Math.round(series.reduce((s, p) => s + p.value, 0) / series.length);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              Financial Reports
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fiscal Year 2023–24 · Station 01 Balancing
            </p>
          </div>
          <RangeTabs value={range} onChange={setRange} />
        </div>

        {/* Financial performance */}
        <SectionHeader title="Financial Performance" right="Fiscal Year 2023-24" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Revenue (Net, Excl. VAT)"
            value="$142,580.00"
            hint="vs. $126,850 last month"
            badge={{ tone: "success", label: "+12.4%", icon: <TrendingUp className="h-3.5 w-3.5" /> }}
          />
          <KpiCard
            label="COGS"
            value="$96,954.00"
            hint="Cost of goods sold · Est. margin 68%"
          />
          <KpiCard
            label="Gross Profit"
            value="$53,160.00"
            hint="Total Revenue − COGS"
          />
          <KpiCard
            variant="primary"
            label="Net Profit (After Tax/Exp)"
            value="$41,010.00"
            hint="Healthy threshold reached"
            icon={<Wallet className="h-5 w-5" />}
          />
        </div>

        {/* Operational cash */}
        <SectionHeader title="Operational Cash" right="Station 01 Balancing" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OpCard
            icon={<Receipt className="h-4 w-4" />}
            label="Cash in Drawer"
            value="$1,450.00"
            hint="Closing balance · Today"
          />
          <OpCard
            icon={<Briefcase className="h-4 w-4" />}
            label="Operating Expenses"
            value="$12,450.00"
            hint="Salary, rent & utilities · MTD"
          />
          <AlertCard
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Low Stock Alerts"
            value="3 Items"
            status="Requires Action"
            to="/inventory"
            cta="View all inventory"
          />
          <AlertCard
            tone="danger"
            icon={<CalendarX className="h-4 w-4" />}
            label="Expiring Soon"
            value="2 Items"
            status="Critical"
            to="/inventory"
            cta="Run disposal report"
          />
        </div>


        {/* Revenue trend */}
        <SectionHeader title="Weekly Revenue Trend" right={rangeLabel[range]} />
        <div className="mt-3 rounded-xl border border-border bg-surface p-4 shadow-elev-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-mono-data">{rangeLabel[range]}</span>
            </div>
            <div className="rounded-full bg-primary-soft px-3 py-1 font-mono-data text-[11px] font-semibold text-primary-soft-foreground">
              Avg: ${avg.toLocaleString()}/day
            </div>
          </div>
          <div className="h-[280px] w-full sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
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
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
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
            {r.label}
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
  badge?: { tone: "success"; label: string; icon?: React.ReactNode };
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
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-mono-data text-[11px] font-bold text-success-soft-foreground">
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
  cta,
  to,
}: {
  tone: "warning" | "danger";
  icon: React.ReactNode;
  label: string;
  value: string;
  status: string;
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
