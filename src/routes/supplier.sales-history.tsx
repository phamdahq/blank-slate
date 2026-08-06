import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import { PHARMACY_PARTNERS, SUPPLIER_SALES, birr, paymentStatus } from "@/lib/supplier-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supplier/sales-history")({
  head: () => ({
    meta: [
      { title: "Sales history · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Ledger of fulfilled wholesale orders with credit and payment tracking.",
      },
      { property: "og:title", content: "Sales history · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Ledger of fulfilled wholesale orders with credit and payment tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesHistory,
});

function SalesHistory() {
  const [pharmacy, setPharmacy] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(
    () =>
      SUPPLIER_SALES.filter((s) => {
        if (pharmacy !== "all" && s.pharmacy_name !== pharmacy) return false;
        if (from && s.date < from) return false;
        if (to && s.date > to) return false;
        return true;
      }),
    [pharmacy, from, to],
  );

  const total = rows.reduce((s, r) => s + r.total_amount, 0);
  const outstanding = rows.reduce((s, r) => s + r.left_balance, 0);

  return (
    <SupplierShell title="Sales History" subtitle="Completed transactions and fulfilled orders">
      <div className="flex flex-wrap gap-3">
        <select
          value={pharmacy}
          onChange={(e) => setPharmacy(e.target.value)}
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          <option value="all">All pharmacy partners</option>
          {PHARMACY_PARTNERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Transactions" value={String(rows.length)} />
        <Stat label="Total billed" value={birr(total)} />
        <Stat label="Outstanding credit" value={birr(outstanding)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-elev-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border bg-surface-low text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Transaction ID</th>
              <th className="px-5 py-3">Pharmacy</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Items sold</th>
              <th className="px-5 py-3">Total amount</th>
              <th className="px-5 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const status = paymentStatus(s.total_amount, s.left_balance);
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 font-mono-data font-semibold">{s.id}</td>
                  <td className="px-5 py-4">{s.pharmacy_name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{s.date}</td>
                  <td className="px-5 py-4">{s.items_sold.toLocaleString()}</td>
                  <td className="px-5 py-4">{birr(s.total_amount)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        status === "Paid"
                          ? "bg-success-soft text-success-soft-foreground"
                          : status === "Partial"
                            ? "bg-warning-soft text-warning-soft-foreground"
                            : "bg-danger-soft text-danger-soft-foreground",
                      )}
                    >
                      {status}
                      {s.left_balance > 0 ? ` · ${birr(s.left_balance)} left` : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  No transactions in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
