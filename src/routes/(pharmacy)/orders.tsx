import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import { useOrders, useOrdersEnabled } from "@/hooks/use-orders";
import { ordersRepo } from "@/db/orders";
import type { OrderRow, OrderStatus } from "@/db/dexie";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/(pharmacy)/orders")({
  head: () => ({
    meta: [
      { title: "Order Management · Phamda" },
      {
        name: "description",
        content:
          "Real-time prescription order queue with cashier processing, cancellation and payment.",
      },
      { property: "og:title", content: "Order Management · Phamda" },
      {
        property: "og:description",
        content: "Track pending, completed and cancelled pharmacy orders in real time.",
      },
    ],
  }),
  component: OrdersPage,
});

const TABS = ["all", "pending", "completed", "cancelled"] as const;
type Tab = (typeof TABS)[number];

function OrdersPage() {
  return (
    <RequireRole roles={["owner", "pharmacist", "cashier"]}>
      <OrdersView />
    </RequireRole>
  );
}

function OrdersView() {
  const { pharmacyId } = useSession();
  const enabled = useOrdersEnabled(pharmacyId);
  const orders = useOrders(pharmacyId);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const visible = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab],
  );

  async function pay(id: string) {
    setBusy(id);
    try {
      await ordersRepo.pay(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not charge this order");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
          Order Management
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Real-time prescription queue and cashier processing.
        </p>

        {!enabled && (
          <div className="mt-4 rounded-lg border border-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
            Order mode is currently off. The pharmacy owner can enable it in Profile →
            Order Management.
          </div>
        )}

        {/* Tabs */}
        <div className="mt-5 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-surface-low p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-4 py-1.5 font-mono-data text-[11px] font-semibold uppercase tracking-wider transition-colors",
                tab === t
                  ? "bg-surface text-primary shadow-elev-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 grid place-items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-mid text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">No {tab === "all" ? "" : tab} orders</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Orders placed from the POS appear here instantly.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visible.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                busy={busy === o.id}
                onPay={() => void pay(o.id)}
                onCancel={() => void ordersRepo.cancel(o.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-warning-soft text-warning-soft-foreground",
  completed: "bg-success-soft text-success-soft-foreground",
  cancelled: "bg-danger-soft text-danger",
};

function OrderCard({
  order,
  busy,
  onPay,
  onCancel,
}: {
  order: OrderRow;
  busy: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const shown = order.items.slice(0, 2);
  const rest = order.items.length - shown.length;
  const pending = order.status === "pending";

  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface p-4 shadow-elev-sm">
      <header className="flex items-start justify-between">
        <div>
          <div className="font-mono-data text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
            Order
          </div>
          <div className="text-lg font-bold text-primary">#{order.order_no}</div>
        </div>
        <div className="flex items-center gap-2">
          {!pending && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono-data text-[10px] font-bold uppercase tracking-wider",
                STATUS_STYLE[order.status],
              )}
            >
              {order.status}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-mono-data text-[11px] text-subtle-foreground">
            <Clock className="h-3 w-3" />
            {ago(order.created_at)}
          </span>
        </div>
      </header>

      <div className="mt-3 font-mono-data text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
        Items ({order.items.length})
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {shown.map((i, idx) => (
          <li
            key={`${i.product_id}-${idx}`}
            className="flex items-start justify-between gap-3 rounded-md bg-surface-low px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate font-mono-data text-xs font-semibold text-primary">
                {i.name} {i.strength} {i.form ? `(${i.form})` : ""}
              </div>
              <div className="font-mono-data text-[10px] text-subtle-foreground">
                Qty: {i.quantity}
              </div>
            </div>
            <div className="font-mono-data text-xs font-semibold">
              {(i.unit_price * i.quantity).toFixed(2)} ETB
            </div>
          </li>
        ))}
        {rest > 0 && (
          <li className="text-center font-mono-data text-[10px] italic text-primary">
            {rest} more item{rest > 1 ? "s" : ""} in cart…
          </li>
        )}
      </ul>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-mono-data text-[10px] font-bold uppercase tracking-wider text-warning">
          Total Due
        </span>
        <span className="font-mono-data text-xl font-bold">{order.total.toFixed(2)} ETB</span>
      </div>

      {pending && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-md border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPay}
            disabled={busy}
            className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? "Resolving…" : "Pay Now"}
          </button>
        </div>
      )}
    </article>
  );
}
