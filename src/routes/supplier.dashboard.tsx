import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Building2, ClipboardList, Wallet } from "lucide-react";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import {
  LOW_STOCK_THRESHOLD,
  MONTHLY_SALES,
  PHARMACY_PARTNERS,
  SUPPLIER_ORDERS,
  SUPPLIER_PRODUCTS,
  SUPPLIER_SALES,
  birr,
} from "@/lib/supplier-mock";

export const Route = createFileRoute("/supplier/dashboard")({
  head: () => ({
    meta: [
      { title: "Supplier dashboard · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Revenue, pending pharmacy orders and stock alerts for Phamda suppliers.",
      },
      { property: "og:title", content: "Supplier dashboard · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Revenue, pending pharmacy orders and stock alerts for Phamda suppliers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierDashboard,
});

function SupplierDashboard() {
  const revenue = SUPPLIER_SALES.reduce((s, x) => s + x.total_amount, 0);
  const pending = SUPPLIER_ORDERS.filter((o) => o.status === "Pending").length;
  const lowStock = SUPPLIER_PRODUCTS.filter((p) => p.quantity <= LOW_STOCK_THRESHOLD).length;
  const recent = [...SUPPLIER_ORDERS].slice(0, 5);

  return (
    <SupplierShell title="Dashboard" subtitle="Your wholesale performance at a glance">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total revenue" value={birr(revenue)} icon={Wallet} tone="primary" />
        <Metric label="Pending orders" value={String(pending)} icon={ClipboardList} tone="warning" />
        <Metric label="Low stock alerts" value={String(lowStock)} icon={AlertTriangle} tone="danger" />
        <Metric
          label="Active pharmacy partners"
          value={String(PHARMACY_PARTNERS.length)}
          icon={Building2}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm xl:col-span-2">
          <h2 className="text-base font-bold">Monthly sales trend</h2>
          <p className="text-sm text-muted-foreground">Revenue booked over the last six months</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_SALES}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(v) => birr(Number(v))}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Recent incoming orders</h2>
            <Link
              to="/supplier/incoming-orders"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {recent.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-data font-semibold">{o.id}</span>
                  <span className="text-xs text-muted-foreground">{o.order_date}</span>
                </div>
                <p className="mt-1 truncate font-semibold">{o.pharmacy_name}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{birr(o.total_cost)}</span>
                  <span className="text-xs font-semibold text-primary">{o.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SupplierShell>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "primary" | "warning" | "danger" | "success";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
  } as const;
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold">{value}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
