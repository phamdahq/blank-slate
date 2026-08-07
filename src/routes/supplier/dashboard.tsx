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
import { SupplierShell, SupplierState } from "@/components/supplier/supplier-shell";
import { birr } from "@/lib/supplier-format";
import { useSupplierContext, useSupplierDashboard } from "@/hooks/use-supplier";

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
  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useSupplierContext();
  const { data, isLoading, error } = useSupplierDashboard(ctx?.supplierId);

  const busy = ctxLoading || isLoading;
  const err = ctxError ?? error;

  return (
    <SupplierShell title="Dashboard" subtitle="Your wholesale performance at a glance">
      {(busy || err || !data) && <SupplierState loading={busy} error={err} />}

      {!busy && !err && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total revenue" value={birr(data.revenue)} icon={Wallet} tone="primary" />
            <Metric
              label="Pending orders"
              value={String(data.pendingOrders)}
              icon={ClipboardList}
              tone="warning"
            />
            <Metric
              label="Low stock alerts"
              value={String(data.lowStock)}
              icon={AlertTriangle}
              tone="danger"
            />
            <Metric
              label="Active pharmacy partners"
              value={String(data.activePartners)}
              icon={Building2}
              tone="success"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm xl:col-span-2">
              <h2 className="text-base font-bold">Monthly sales trend</h2>
              <p className="text-sm text-muted-foreground">
                Revenue from received orders over the last six months
              </p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly}>
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
                {data.recent.map((o) => (
                  <li key={o.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono-data font-semibold">
                        {o.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">{o.order_date}</span>
                    </div>
                    <p className="mt-1 truncate font-semibold">{o.pharmacy_name}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{birr(o.total_cost)}</span>
                      <span className="text-xs font-semibold text-primary">{o.status}</span>
                    </div>
                  </li>
                ))}
                {data.recent.length === 0 && (
                  <li className="py-8 text-center text-sm text-muted-foreground">
                    No orders yet.
                  </li>
                )}
              </ul>
            </section>
          </div>
        </>
      )}
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
