import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Receipt,
  TrendingUp,
  Package,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import {
  useCashiers,
  useSalesHistory,
  useTransactionLines,
} from "@/hooks/use-sales-history";
import type { SalesHistoryRow } from "@/services/pos/salesHistoryService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales History · Phamda" },
      {
        name: "description",
        content:
          "Searchable ledger of every completed pharmacy sale with revenue, profit margin and cashier attribution.",
      },
      { property: "og:title", content: "Sales History · Phamda" },
      {
        property: "og:description",
        content: "Audit transactions, filter by date or cashier and reprint receipts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesHistoryPage,
});

const PAGE_SIZE = 25;

function etb(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}

function SalesHistoryPage() {
  return (
    <RequireRole roles={["owner", "pharmacist", "cashier"]}>
      <SalesHistoryView />
    </RequireRole>
  );
}

function SalesHistoryView() {
  const { pharmacyId } = useSession();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [soldBy, setSoldBy] = useState("");
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState<string | null>(null);

  const filters = useMemo(
    () =>
      pharmacyId
        ? {
            pharmacyId,
            search,
            from: from || null,
            to: to || null,
            soldBy: soldBy || null,
            page,
            pageSize: PAGE_SIZE,
          }
        : null,
    [pharmacyId, search, from, to, soldBy, page],
  );

  const { data, isLoading, error } = useSalesHistory(filters);
  const { data: cashiers = [] } = useCashiers(pharmacyId);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totals = data?.totals ?? { revenue: 0, profit: 0, items: 0, transactions: 0 };
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function reset(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <AppShell>
      <div className="space-y-5 px-4 py-5 md:px-6 xl:px-8">
        <header>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Sales history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every completed transaction, with profit and cashier attribution.
          </p>
        </header>

        {/* Summary metrics */}
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            icon={Receipt}
            label="Total revenue"
            value={etb(totals.revenue)}
            hint={`${totals.transactions} transactions`}
          />
          <MetricCard
            icon={TrendingUp}
            label="Total profit"
            value={etb(totals.profit)}
            hint={
              totals.revenue > 0
                ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}% margin`
                : "—"
            }
          />
          <MetricCard
            icon={Package}
            label="Items sold"
            value={totals.items.toLocaleString()}
            hint={`${rows.length} lines on this page`}
          />
        </div>

        {/* Filter bar */}
        <div className="rounded-lg border border-border bg-surface p-3 shadow-elev-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => reset(() => setSearch(e.target.value))}
                placeholder="Transaction ID or product…"
                className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                aria-label="Search sales"
              />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => reset(() => setFrom(e.target.value))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                aria-label="Start date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => reset(() => setTo(e.target.value))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                aria-label="End date"
              />
            </div>
            <label className="relative block">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={soldBy}
                onChange={(e) => reset(() => setSoldBy(e.target.value))}
                className="h-10 w-full appearance-none rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                aria-label="Filter by cashier"
              >
                <option value="">All staff</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.role}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                reset(() => {
                  setSearch("");
                  setFrom("");
                  setTo("");
                  setSoldBy("");
                })
              }
              className="h-10 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-surface-low hover:text-foreground"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-low text-left text-xs uppercase tracking-wide text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Transaction</th>
                  <th className="px-4 py-3 font-semibold">Date / time</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit price</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Profit</th>
                  <th className="px-4 py-3 font-semibold">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      Loading sales…
                    </td>
                  </tr>
                )}
                {error && !isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-danger">
                      {(error as Error).message}
                    </td>
                  </tr>
                )}
                {!isLoading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No sales match these filters.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => r.transaction_id && setReceipt(r.transaction_id)}
                    className="cursor-pointer hover:bg-surface-low"
                  >
                    <td className="px-4 py-3 font-mono-data text-xs font-semibold text-primary">
                      {r.transaction_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : r.sale_date}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.product_name}</td>
                    <td className="px-4 py-3 text-right">{r.quantity_sold}</td>
                    <td className="px-4 py-3 text-right">{etb(r.selling_price_at_sale)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {etb(r.cost_price_at_sale)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold",
                        r.profit >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {etb(r.profit)}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({(r.margin * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.cashier_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {pageCount} · {total.toLocaleString()} lines
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {receipt && (
        <ReceiptModal
          pharmacyId={pharmacyId}
          transactionId={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-elev-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ReceiptModal({
  pharmacyId,
  transactionId,
  onClose,
}: {
  pharmacyId: string | null;
  transactionId: string;
  onClose: () => void;
}) {
  const { data: lines = [], isLoading } = useTransactionLines(pharmacyId, transactionId);
  const revenue = lines.reduce((s, l) => s + l.revenue, 0);
  const profit = lines.reduce((s, l) => s + l.profit, 0);
  const first: SalesHistoryRow | undefined = lines[0];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface shadow-elev-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Receipt</h2>
            <p className="font-mono-data text-xs text-muted-foreground">{transactionId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading receipt…</p>}
          {!isLoading && first && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-subtle-foreground">Date</dt>
                <dd className="font-medium">
                  {first.created_at
                    ? new Date(first.created_at).toLocaleString()
                    : first.sale_date}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-subtle-foreground">Cashier</dt>
                <dd className="font-medium">{first.cashier_name}</dd>
              </div>
            </dl>
          )}

          <ul className="divide-y divide-border rounded-md border border-border">
            {lines.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.quantity_sold} × {etb(l.selling_price_at_sale)} · cost{" "}
                    {etb(l.cost_price_at_sale)}
                  </div>
                </div>
                <div className="whitespace-nowrap text-right">
                  <div className="font-semibold">{etb(l.revenue)}</div>
                  <div className="text-xs text-success">+{etb(l.profit)}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1 rounded-md bg-surface-low p-3 text-sm">
            <Row label="Total" value={etb(revenue)} strong />
            <Row label="Profit" value={etb(profit)} />
            <Row
              label="Margin"
              value={revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : "—"}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
