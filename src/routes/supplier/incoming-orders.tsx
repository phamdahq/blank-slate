import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { SupplierShell, SupplierState } from "@/components/supplier/supplier-shell";
import { birr, type OrderStatus } from "@/lib/supplier-format";
import type { SupplierOrder } from "@/services/supplier/supplierOrdersService";
import {
  useIncomingOrders,
  useOrderItems,
  useSupplierContext,
  useUpdateOrderStatus,
} from "@/hooks/use-supplier";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supplier/incoming-orders")({
  head: () => ({
    meta: [
      { title: "Incoming orders · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Review, approve and fulfil purchase orders sent by partner pharmacies.",
      },
      { property: "og:title", content: "Incoming orders · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Review, approve and fulfil purchase orders sent by partner pharmacies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncomingOrders,
});

const STATUSES: Array<OrderStatus | "all"> = ["all", "Pending", "Approved", "Received", "Cancelled"];

function IncomingOrders() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useSupplierContext();
  const { data, isLoading, error } = useIncomingOrders(ctx?.supplierId, {
    search,
    status,
    from,
    to,
  });
  const statusMutation = useUpdateOrderStatus();

  const rows = data ?? [];
  const busy = ctxLoading || isLoading;
  const err = ctxError ?? error;
  const selected = rows.find((o) => o.id === openId) ?? null;

  return (
    <SupplierShell title="Incoming Orders" subtitle="Purchase orders sent by pharmacies">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID or pharmacy…"
            className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="To date"
        />
      </div>

      {(busy || err) && <SupplierState loading={busy} error={err} />}

      {!busy && !err && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-elev-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-surface-low text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Pharmacy</th>
                <th className="px-5 py-3">Order date</th>
                <th className="px-5 py-3">Total cost</th>
                <th className="px-5 py-3">Remaining</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-low"
                >
                  <td className="px-5 py-4 font-mono-data font-semibold">{o.id.slice(0, 8)}</td>
                  <td className="px-5 py-4">{o.pharmacy_name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{o.order_date}</td>
                  <td className="px-5 py-4">{birr(o.total_cost)}</td>
                  <td className="px-5 py-4">{birr(o.left_balance)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <OrderDrawer
          order={selected}
          saving={statusMutation.isPending}
          onClose={() => setOpenId(null)}
          onStatus={(s) => statusMutation.mutate({ id: selected.id, status: s })}
        />
      )}
    </SupplierShell>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "Pending"
      ? "bg-warning-soft text-warning-soft-foreground"
      : status === "Approved"
        ? "bg-primary-soft text-primary-soft-foreground"
        : status === "Received"
          ? "bg-success-soft text-success-soft-foreground"
          : "bg-danger-soft text-danger-soft-foreground";
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>{status}</span>
  );
}

function OrderDrawer({
  order,
  saving,
  onClose,
  onStatus,
}: {
  order: SupplierOrder;
  saving: boolean;
  onClose: () => void;
  onStatus: (s: OrderStatus) => void;
}) {
  const { data: items, isLoading, error } = useOrderItems(order.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface shadow-elev-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <p className="font-mono-data text-sm font-bold">{order.id.slice(0, 8)}</p>
            <h2 className="truncate text-lg font-bold">{order.pharmacy_name}</h2>
            <p className="text-sm text-muted-foreground">Ordered {order.order_date}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="grid h-9 w-9 place-items-center rounded-md border border-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 p-5">
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-sm text-muted-foreground">
              Remaining balance {birr(order.left_balance)}
            </span>
          </div>

          {(isLoading || error) && <SupplierState loading={isLoading} error={error} />}

          {!isLoading && !error && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="bg-surface-low text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-3 py-2">{i.product_name}</td>
                      <td className="px-3 py-2 font-mono-data text-xs">{i.batch_number}</td>
                      <td className="px-3 py-2">{i.quantity}</td>
                      <td className="px-3 py-2">{birr(i.unit_cost)}</td>
                      <td className="px-3 py-2">{birr(i.total_price)}</td>
                    </tr>
                  ))}
                  {(items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        No line items on this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-surface-low px-4 py-3 text-sm font-bold">
            <span>Order total</span>
            <span>{birr(order.total_cost)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border p-5">
          <button
            disabled={saving || order.status !== "Pending"}
            onClick={() => onStatus("Approved")}
            className="h-10 flex-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={saving || order.status === "Received" || order.status === "Cancelled"}
            onClick={() => onStatus("Received")}
            className="h-10 flex-1 rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface-low disabled:opacity-50"
          >
            Mark received
          </button>
          <button
            disabled={saving || order.status === "Received" || order.status === "Cancelled"}
            onClick={() => onStatus("Cancelled")}
            className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
