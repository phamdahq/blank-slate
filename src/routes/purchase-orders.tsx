import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Trash2,
  Truck,
  PackageCheck,
  Ban,
  Wallet,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import { db } from "@/db/dexie";
import {
  useOrderItems,
  usePurchaseOrders,
  useSuppliers,
} from "@/hooks/use-purchase-orders";
import * as purchaseOrderService from "@/services/purchasing/purchaseOrderService";
import type {
  NewPurchaseOrderLine,
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/services/purchasing/purchaseOrderService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({
    meta: [
      { title: "Purchase Orders · Phamda" },
      {
        name: "description",
        content:
          "Create supplier purchase orders, track fulfilment status and monitor outstanding credit balances.",
      },
      { property: "og:title", content: "Purchase Orders · Phamda" },
      {
        property: "og:description",
        content: "Procurement workspace for pharmacy stock orders and supplier credit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchaseOrdersPage,
});

const TABS: (PurchaseOrderStatus | "all")[] = ["all", "Pending", "Received", "Cancelled"];

function etb(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}

function PurchaseOrdersPage() {
  return (
    <RequireRole roles={["owner", "pharmacist"]}>
      <PurchaseOrdersView />
    </RequireRole>
  );
}

function PurchaseOrdersView() {
  const { pharmacyId } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<PurchaseOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);

  const { data: orders = [], isLoading, error } = usePurchaseOrders(pharmacyId, tab, search);

  const outstanding = orders.reduce((s, o) => s + (o.status === "Cancelled" ? 0 : o.left_balance), 0);

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  }

  return (
    <AppShell>
      <div className="space-y-5 px-4 py-5 md:px-6 xl:px-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Purchase orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Supplier orders, fulfilment status and outstanding credit —{" "}
              <span className="font-semibold text-foreground">{etb(outstanding)}</span> owed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New purchase order
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-md border border-border bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-sidebar-active text-sidebar-active-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier or order id…"
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              aria-label="Search purchase orders"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-elev-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-low text-left text-xs uppercase tracking-wide text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Order date</th>
                  <th className="px-4 py-3 text-right font-semibold">Total cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Loading orders…
                    </td>
                  </tr>
                )}
                {error && !isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-danger">
                      {(error as Error).message}
                    </td>
                  </tr>
                )}
                {!isLoading && !error && orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No purchase orders yet.
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-low">
                    <td className="px-4 py-3 font-mono-data text-xs font-semibold text-primary">
                      {o.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium">{o.supplier_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.order_date}</td>
                    <td className="px-4 py-3 text-right">{etb(o.total_cost)}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold",
                        o.left_balance > 0 ? "text-warning" : "text-success",
                      )}
                    >
                      {etb(o.left_balance)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetail(o)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-low"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {creating && pharmacyId && (
        <CreateOrderModal
          pharmacyId={pharmacyId}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            refresh();
          }}
        />
      )}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const map: Record<PurchaseOrderStatus, string> = {
    Pending: "bg-warning-soft text-warning",
    Received: "bg-success-soft text-success",
    Cancelled: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        map[status],
      )}
    >
      {status}
    </span>
  );
}

// ---------------- Create ----------------

type DraftLine = NewPurchaseOrderLine & { key: string };

function emptyLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    product_id: "",
    quantity_ordered: 0,
    unit_cost: 0,
    batch_number: "",
    expiry_date: "",
    selling_price: undefined,
  };
}

function CreateOrderModal({
  pharmacyId,
  onClose,
  onSaved,
}: {
  pharmacyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: suppliers = [] } = useSuppliers();
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), [], []) ?? [];
  const [mode, setMode] = useState<"registered" | "adhoc">(
    suppliers.length > 0 ? "registered" : "adhoc",
  );
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PurchaseOrderStatus>("Pending");
  const [paid, setPaid] = useState<number | "">("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (l.quantity_ordered || 0) * (l.unit_cost || 0), 0),
    [lines],
  );

  function patch(key: string, next: Partial<DraftLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...next } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await purchaseOrderService.createPurchaseOrder({
        pharmacy_id: pharmacyId,
        supplier_id: mode === "registered" ? supplierId || null : null,
        supplier_name_fallback: mode === "adhoc" ? supplierName : null,
        order_date: orderDate,
        status,
        amount_paid: paid === "" ? 0 : Number(paid),
        lines: lines.map(({ key: _key, ...l }) => l),
      });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-surface shadow-elev-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="inline-flex items-center gap-2 text-base font-bold">
            <Truck className="h-4 w-4" /> New purchase order
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Supplier */}
          <div className="space-y-2">
            <div className="flex gap-1 rounded-md border border-border p-1 text-sm">
              {(["registered", "adhoc"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 font-medium",
                    mode === m
                      ? "bg-sidebar-active text-sidebar-active-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {m === "registered" ? "Registered supplier" : "Ad-hoc supplier"}
                </button>
              ))}
            </div>
            {mode === "registered" ? (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                aria-label="Supplier"
              >
                <option value="">Select a supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.city ? ` · ${s.city}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                placeholder="Supplier name"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Order date">
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Fulfilment status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Received">Received</option>
              </select>
            </Field>
            <Field label="Amount paid now (ETB)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={paid}
                onChange={(e) => setPaid(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </Field>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line items</h3>
              <button
                type="button"
                onClick={() => setLines((ls) => [...ls, emptyLine()])}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-low"
              >
                <Plus className="h-3.5 w-3.5" /> Add line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((l) => (
                <div
                  key={l.key}
                  className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2 xl:grid-cols-6"
                >
                  <select
                    value={l.product_id}
                    onChange={(e) => patch(l.key, { product_id: e.target.value })}
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm xl:col-span-2"
                    aria-label="Product"
                  >
                    <option value="">Product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.strength ? ` ${p.strength}` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={l.quantity_ordered || ""}
                    onChange={(e) =>
                      patch(l.key, { quantity_ordered: Number(e.target.value) || 0 })
                    }
                    placeholder="Qty"
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label="Quantity ordered"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.unit_cost || ""}
                    onChange={(e) => patch(l.key, { unit_cost: Number(e.target.value) || 0 })}
                    placeholder="Unit cost"
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label="Unit cost"
                  />
                  <input
                    value={l.batch_number ?? ""}
                    onChange={(e) => patch(l.key, { batch_number: e.target.value })}
                    placeholder="Batch no."
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label="Batch number"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={l.expiry_date ?? ""}
                      onChange={(e) => patch(l.key, { expiry_date: e.target.value })}
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                      aria-label="Expiry date"
                    />
                    <button
                      type="button"
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      aria-label="Remove line"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.selling_price ?? ""}
                    onChange={(e) =>
                      patch(l.key, {
                        selling_price: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="Selling price"
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm xl:col-span-2"
                    aria-label="Selling price"
                  />
                  <div className="self-center text-right text-sm font-semibold xl:col-span-4">
                    {etb((l.quantity_ordered || 0) * (l.unit_cost || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 rounded-md bg-surface-low p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-bold">{etb(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credit balance after payment</span>
              <span className="font-semibold">
                {etb(Math.max(0, total - (paid === "" ? 0 : Number(paid))))}
              </span>
            </div>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create order"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---------------- Detail ----------------

function OrderDetailModal({
  order,
  onClose,
  onChanged,
}: {
  order: PurchaseOrder;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: items = [], isLoading } = useOrderItems(order.id);
  const products = useLiveQuery(() => db.products.toArray(), [], []) ?? [];
  const [amount, setAmount] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "Product";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface shadow-elev-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{order.supplier_name}</h2>
            <p className="font-mono-data text-xs text-muted-foreground">
              {order.id.slice(0, 8).toUpperCase()} · {order.order_date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-sm text-muted-foreground">
              {etb(order.total_cost)} total · {etb(order.left_balance)} outstanding
            </span>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading line items…</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{nameOf(it.product_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.quantity_ordered} × {etb(it.unit_cost)}
                      {it.expiry_date ? ` · exp ${it.expiry_date}` : ""}
                    </div>
                  </div>
                  <span className="whitespace-nowrap font-semibold">{etb(it.total_price)}</span>
                </li>
              ))}
            </ul>
          )}

          {order.status !== "Cancelled" && order.left_balance > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4" /> Record a payment
              </h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Amount (ETB)"
                  className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                  aria-label="Payment amount"
                />
                <button
                  type="button"
                  disabled={busy || amount === ""}
                  onClick={() =>
                    run(() => purchaseOrderService.recordPayment(order.id, Number(amount)))
                  }
                  className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {err && <p className="text-sm text-danger">{err}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          {order.status === "Pending" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => purchaseOrderService.cancelOrder(order.id))}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-danger disabled:opacity-60"
              >
                <Ban className="h-4 w-4" /> Cancel order
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => purchaseOrderService.markReceived(order))}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <PackageCheck className="h-4 w-4" /> Mark received
              </button>
            </>
          )}
          {order.status !== "Pending" && (
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-border px-4 text-sm font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
