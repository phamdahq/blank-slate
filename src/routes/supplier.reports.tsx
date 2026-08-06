import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { SupplierShell, SupplierState } from "@/components/supplier/supplier-shell";
import { birr } from "@/lib/supplier-format";
import { useSupplierContext, useSupplierReports } from "@/hooks/use-supplier";

export const Route = createFileRoute("/supplier/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Top-selling products, partner revenue breakdown and volume trends for suppliers.",
      },
      { property: "og:title", content: "Reports · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Top-selling products, partner revenue breakdown and volume trends for suppliers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierReports,
});

function SupplierReports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useSupplierContext();
  const { data, isLoading, error } = useSupplierReports(ctx?.supplierId, from, to);

  const busy = ctxLoading || isLoading;
  const err = ctxError ?? error;

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Order ID", "Pharmacy", "Date", "Items sold", "Total amount", "Left balance"],
      ...data.sales.map((s) => [
        s.id,
        s.pharmacy_name,
        s.date,
        String(s.items_sold),
        String(s.total_amount),
        String(s.left_balance),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "supplier-sales.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SupplierShell
      title="Reports"
      subtitle="Revenue, product performance and partner mix"
      actions={
        <button
          onClick={exportCsv}
          disabled={!data || data.sales.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface-low disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      }
    >
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        />
      </div>

      {(busy || err || !data) && <SupplierState loading={busy} error={err} />}

      {!busy && !err && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Revenue" value={birr(data.totalRevenue)} />
            <Stat label="Outstanding credit" value={birr(data.outstanding)} />
            <Stat label="Fulfilled orders" value={String(data.sales.length)} />
          </div>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
            <h2 className="text-base font-bold">Revenue trend</h2>
            <div className="mt-4 h-[280px]">
              {data.monthly.length === 0 ? (
                <p className="pt-20 text-center text-sm text-muted-foreground">
                  No revenue in this range.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip formatter={(v) => birr(Number(v))} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
              <h2 className="text-base font-bold">Top selling products</h2>
              <ul className="mt-4 space-y-3">
                {data.topProducts.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold">{p.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {p.units.toLocaleString()} units · {birr(p.revenue)}
                    </span>
                  </li>
                ))}
                {data.topProducts.length === 0 && (
                  <li className="py-8 text-center text-sm text-muted-foreground">No sales yet.</li>
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
              <h2 className="text-base font-bold">Revenue by pharmacy</h2>
              <ul className="mt-4 space-y-3">
                {data.byPharmacy.map((p) => {
                  const pct = data.totalRevenue > 0 ? (p.revenue / data.totalRevenue) * 100 : 0;
                  return (
                    <li key={p.name} className="text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate font-semibold">{p.name}</span>
                        <span className="shrink-0 text-muted-foreground">{birr(p.revenue)}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-surface-low">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
                {data.byPharmacy.length === 0 && (
                  <li className="py-8 text-center text-sm text-muted-foreground">
                    No partner revenue yet.
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold">{value}</p>
    </div>
  );
}
