import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Store,
  PackageX,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import { useMarketplaceListings, useMarketplaceSuppliers } from "@/hooks/use-marketplace";
import {
  CATEGORIES,
  cartTotal,
  submitMarketplaceOrder,
  type MarketplaceCartLine,
  type MarketplaceListing,
  type ProductCategory,
} from "@/services/marketplace/marketplaceService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Supplier Marketplace · Phamda" },
      {
        name: "description",
        content:
          "Browse live supplier stock across the platform, compare prices and place purchase orders in one place.",
      },
      { property: "og:title", content: "Supplier Marketplace · Phamda" },
      {
        property: "og:description",
        content: "Live supplier catalogs and one-click purchase orders for your pharmacy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketplacePage,
});

function etb(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  pharmaceutical: "Pharmaceutical",
  cosmetic: "Cosmetic",
  medical_device: "Medical device",
  supplies: "Supplies",
};

function MarketplacePage() {
  return (
    <RequireRole roles={["owner", "pharmacist"]}>
      <MarketplaceView />
    </RequireRole>
  );
}

function MarketplaceView() {
  const { pharmacyId } = useSession();
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState<string | "all">("all");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [cart, setCart] = useState<MarketplaceCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);

  const { data: suppliers = [] } = useMarketplaceSuppliers();
  const {
    data: listings = [],
    isLoading,
    error,
  } = useMarketplaceListings({ search, supplierId, category });

  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const total = useMemo(() => cartTotal(cart), [cart]);
  const inCart = useMemo(
    () => new Map(cart.map((l) => [l.listing.id, l.quantity])),
    [cart],
  );

  function addToOrder(listing: MarketplaceListing) {
    setCart((prev) => {
      const existing = prev.find((l) => l.listing.id === listing.id);
      if (existing) {
        if (existing.quantity >= listing.quantity) return prev;
        return prev.map((l) =>
          l.listing.id === listing.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { listing, quantity: 1 }];
    });
    toast.success(`${listing.product_name} added to order`);
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.listing.id !== id) return [l];
        const next = Math.min(Math.max(qty, 0), l.listing.quantity);
        return next === 0 ? [] : [{ ...l, quantity: next }];
      }),
    );
  }

  return (
    <AppShell
      topBarSlot={
        <CartButton count={count} total={total} onClick={() => setCartOpen(true)} compact />
      }
    >
      <div className="space-y-5 px-4 py-5 md:px-6 xl:px-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Supplier marketplace</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Browse live stock from suppliers across the platform, compare prices and send
              purchase orders without leaving your workspace.
            </p>
          </div>
          <div className="hidden md:block">
            <CartButton count={count} total={total} onClick={() => setCartOpen(true)} />
          </div>
        </header>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_200px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, generic, dosage form or strength…"
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              aria-label="Search supplier catalog"
            />
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            aria-label="Filter by supplier"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="all">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory | "all")}
            aria-label="Filter by category"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {(error as Error).message}
          </p>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-elev-sm lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-low text-left text-xs uppercase tracking-wide text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Strength / UOM</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Available</th>
                  <th className="px-4 py-3 font-semibold">Unit price</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && listings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                )}
                {!isLoading && listings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No supplier stock matches these filters.
                    </td>
                  </tr>
                )}
                {listings.map((l) => {
                  const out = l.quantity <= 0;
                  return (
                    <tr key={l.id} className="hover:bg-surface-low">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{l.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.generic_name ?? "—"}
                          {l.category ? ` · ${CATEGORY_LABEL[l.category]}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono-data text-xs">
                        {[l.strength, l.uom, l.dosage_form].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            {l.supplier_name}
                            {l.supplier_city ? (
                              <span className="block text-xs text-muted-foreground">
                                {l.supplier_city}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge qty={l.quantity} />
                      </td>
                      <td className="px-4 py-3 font-semibold">{etb(l.selling_price)}</td>
                      <td className="px-4 py-3 text-right">
                        <AddButton
                          disabled={out || (inCart.get(l.id) ?? 0) >= l.quantity}
                          inCart={inCart.get(l.id) ?? 0}
                          onClick={() => addToOrder(l)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile / tablet cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {isLoading && listings.length === 0 && (
            <div className="col-span-full grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && listings.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No supplier stock matches these filters.
            </p>
          )}
          {listings.map((l) => (
            <article
              key={l.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-elev-sm"
            >
              <div>
                <h2 className="font-semibold leading-tight">{l.product_name}</h2>
                <p className="text-xs text-muted-foreground">
                  {[l.generic_name, l.strength, l.uom].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> {l.supplier_name}
                </span>
                <StockBadge qty={l.quantity} />
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <span className="text-base font-bold">{etb(l.selling_price)}</span>
                <AddButton
                  disabled={l.quantity <= 0 || (inCart.get(l.id) ?? 0) >= l.quantity}
                  inCart={inCart.get(l.id) ?? 0}
                  onClick={() => addToOrder(l)}
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      {cartOpen && (
        <CartDrawer
          lines={cart}
          total={total}
          onClose={() => setCartOpen(false)}
          onClear={() => setCart([])}
          onQty={setQty}
          onSubmit={() => setCheckout(true)}
        />
      )}

      {checkout && (
        <CheckoutModal
          lines={cart}
          total={total}
          pharmacyId={pharmacyId}
          onClose={() => setCheckout(false)}
          onDone={() => {
            setCheckout(false);
            setCartOpen(false);
            setCart([]);
          }}
        />
      )}
    </AppShell>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-mid px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <PackageX className="h-3 w-3" /> Out of stock
      </span>
    );
  }
  const low = qty < 20;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono-data text-[11px] font-semibold",
        low ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
      )}
    >
      {qty} in stock
    </span>
  );
}

function AddButton({
  disabled,
  inCart,
  onClick,
}: {
  disabled: boolean;
  inCart: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors",
        disabled
          ? "cursor-not-allowed bg-surface-mid text-muted-foreground"
          : "bg-primary text-primary-foreground hover:opacity-90",
      )}
    >
      <Plus className="h-4 w-4" />
      {inCart > 0 ? `In order (${inCart})` : "Add to order"}
    </button>
  );
}

function CartButton({
  count,
  total,
  onClick,
  compact,
}: {
  count: number;
  total: number;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-low",
        compact && "md:hidden h-9",
      )}
      aria-label={`Open order cart, ${count} items`}
    >
      <ShoppingCart className="h-4 w-4" />
      {!compact && <span>{etb(total)}</span>}
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

function CartDrawer({
  lines,
  total,
  onClose,
  onClear,
  onQty,
  onSubmit,
}: {
  lines: MarketplaceCartLine[];
  total: number;
  onClose: () => void;
  onClear: () => void;
  onQty: (id: string, qty: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-elev-lg">
        <header className="flex items-center justify-between border-b border-border px-4 py-4">
          <div>
            <h2 className="text-base font-bold">Order cart</h2>
            <p className="text-xs text-muted-foreground">
              {lines.length} product{lines.length === 1 ? "" : "s"} selected
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
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {lines.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Your order is empty. Add products from the marketplace.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map(({ listing, quantity }) => (
                <li
                  key={listing.id}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{listing.product_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {listing.supplier_name} · {etb(listing.selling_price)} / unit
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${listing.product_name}`}
                      onClick={() => onQty(listing.id, 0)}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-low hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-md border border-border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => onQty(listing.id, quantity - 1)}
                        className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        value={quantity}
                        onChange={(e) => onQty(listing.id, Number(e.target.value) || 0)}
                        inputMode="numeric"
                        aria-label={`Quantity for ${listing.product_name}`}
                        className="h-8 w-12 bg-transparent text-center font-mono-data text-sm outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => onQty(listing.id, quantity + 1)}
                        className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-semibold">
                      {etb(quantity * listing.selling_price)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Max available: {listing.quantity}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="space-y-3 border-t border-border px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="text-lg font-bold">{etb(total)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClear}
              disabled={lines.length === 0}
              className="h-10 flex-1 rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-surface-low disabled:opacity-50"
            >
              Clear cart
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={lines.length === 0}
              className="h-10 flex-[1.4] rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Submit purchase order
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function CheckoutModal({
  lines,
  total,
  pharmacyId,
  onClose,
  onDone,
}: {
  lines: MarketplaceCartLine[];
  total: number;
  pharmacyId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const supplierCount = new Set(lines.map((l) => l.listing.supplier_id)).size;

  async function submit() {
    if (!pharmacyId) {
      toast.error("No pharmacy found for your account.");
      return;
    }
    setBusy(true);
    try {
      const res = await submitMarketplaceOrder({
        pharmacy_id: pharmacyId,
        lines,
        delivery_date: deliveryDate || null,
        notes: notes.trim() || null,
      });
      toast.success(
        res.orderIds.length > 1
          ? `${res.orderIds.length} purchase orders submitted · ${etb(res.total)}`
          : `Purchase order submitted · ${etb(res.total)}`,
      );
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center">
      <button
        type="button"
        aria-label="Close checkout"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-lg rounded-t-2xl border border-border bg-surface p-5 shadow-elev-lg sm:rounded-2xl">
        <header className="mb-4">
          <h2 className="text-lg font-bold">Confirm purchase order</h2>
          <p className="text-sm text-muted-foreground">
            {lines.length} product{lines.length === 1 ? "" : "s"} from {supplierCount} supplier
            {supplierCount === 1 ? "" : "s"}. Suppliers review and confirm before dispatch.
          </p>
        </header>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Desired delivery date
            </span>
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={deliveryDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Notes for the supplier (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Delivery instructions, contact person, packaging notes…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <dl className="rounded-lg border border-border bg-surface-low p-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Total cost</dt>
              <dd className="font-semibold">{etb(total)}</dd>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <dt className="text-muted-foreground">Outstanding balance on issue</dt>
              <dd className="font-semibold">{etb(total)}</dd>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-semibold">Pending</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-surface-low"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex h-10 flex-[1.4] items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Place order
          </button>
        </div>
      </div>
    </div>
  );
}