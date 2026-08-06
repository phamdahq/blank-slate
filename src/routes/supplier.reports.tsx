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
import { Download, FileText } from "lucide-react";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import { MONTHLY_SALES, SUPPLIER_SALES, TOP_PRODUCTS, birr } from "@/lib/supplier-mock";

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
  const [note, setNote] = useState<string | null>(null);

  const byPharmacy = Object.entries(
    SUPPLIER_SALES.reduce<Record<string, number>>((acc, s) => {
      acc[s.pharmacy_name] = (acc[s.pharmacy_name] ?? 0) + s.total_amount;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const grand = byPharmacy.reduce((s, [, v]) => s + v, 0);

  function exportCsv() {
    const rows = [
      ["Transaction ID", "Pharmacy", "Date", "Items sold", "Total amount", "Left balance"],
      ...SUPPLIER_SALES.map((s) => [
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
    a.download = "supplier-sales-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    setNote("CSV exported.");
  }

  return (
    <SupplierShell
      title="Reports"
      subtitle="Performance analytics across your pharmacy network"
      actions={
        <>
          <button
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              setNote("PDF export queued (simulation).");
              window.print();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface-low"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </button>
        </>
      }
    >
      {note && (
        <p className="rounded-lg bg-success-soft px-4 py-2 text-sm font-semibold text-success-soft-foreground">
          {note}
        </p>
      )}

      <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
        <h2 className="text-base font-bold">Volume &amp; revenue over time</h2>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MONTHLY_SALES}>
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
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
          <h2 className="text-base font-bold">Top-selling products</h2>
          <ul className="mt-4 space-y-3">
            {TOP_PRODUCTS.map((p) => (
              <li key={p.name} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold">{p.name}</span>
                  <span className="shrink-0 text-muted-foreground">{birr(p.revenue)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-low">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(p.units / TOP_PRODUCTS[0]!.units) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.units.toLocaleString()} units sold
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
          <h2 className="text-base font-bold">Revenue by pharmacy partner</h2>
          <ul className="mt-4 space-y-3">
            {byPharmacy.map(([name, value]) => (
              <li key={name} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {birr(value)} · {Math.round((value / grand) * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-low">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${(value / grand) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SupplierShell>
  );
}
