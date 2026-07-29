import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  Receipt,
} from "lucide-react";
import { AppShellWithSlot } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import { useOnline } from "@/hooks/use-online";
import { useCatalog, type Medication, type Batch } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import * as salesService from "@/services/pos/salesService";




export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "POS · PharmaCore" },
      {
        name: "description",
        content: "Fast medication checkout with batch selection and live cart totals.",
      },
      { property: "og:title", content: "POS · PharmaCore" },
      {
        property: "og:description",
        content: "Point-of-sale workflow for pharmacy operations with batch-level dispensing.",
      },
    ],
  }),
  component: PosPage,
});

interface CartLine {
  medId: string;
  qty: number;
  batchId: string;
}

function PosPage() {
  // Every signed-in pharmacy role can sell.
  return (
    <RequireRole roles={["owner", "pharmacist", "cashier"]}>
      <PosView />
    </RequireRole>
  );
}

function PosView() {
  const { pharmacyId } = useSession();
  // Catalog is sourced exclusively from local Dexie inventory — fully offline.
  const medications = useCatalog(pharmacyId);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.ndc.includes(q),
    );
  }, [query, medications]);

  function addToCart(med: Medication) {
    const firstBatch = med.batches.find((b) => b.quantity > 0);
    if (!firstBatch) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.medId === med.id);
      if (existing) {
        return prev.map((l) => (l.medId === med.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { medId: med.id, qty: 1, batchId: firstBatch.id }];
    });
  }

  function setQty(medId: string, qty: number) {
    setCart((prev) =>
      qty <= 0 ? prev.filter((l) => l.medId !== medId) : prev.map((l) => (l.medId === medId ? { ...l, qty } : l)),
    );
  }

  function setBatch(medId: string, batchId: string) {
    setCart((prev) => prev.map((l) => (l.medId === medId ? { ...l, batchId } : l)));
  }

  function removeLine(medId: string) {
    setCart((prev) => prev.filter((l) => l.medId !== medId));
  }

  const lines = cart
    .map((l) => {
      const med = medications.find((m) => m.id === l.medId);
      if (!med) return null;
      const batch = med.batches.find((b) => b.id === l.batchId) ?? med.batches[0];
      return { line: l, med, batch };
    })
    .filter(Boolean) as { line: CartLine; med: Medication; batch: Batch }[];

  const subtotal = lines.reduce((s, x) => s + x.med.price * x.line.qty, 0);
  const total = subtotal;
  const itemCount = lines.reduce((s, x) => s + x.line.qty, 0);
  const [charging, setCharging] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);

  async function handleCharge() {
    if (lines.length === 0 || charging) return;
    if (!pharmacyId) {
      alert("No pharmacy is linked to your account.");
      return;
    }
    setCharging(true);
    try {
      const result = await salesService.checkout(
        pharmacyId,
        lines.map((x) => ({
          product_id: x.med.id,
          batch_id: x.batch.id,
          quantity: x.line.qty,
          selling_price: x.med.price,
        })),
      );
      setCart([]);
      setMobileCartOpen(false);
      setQueuedOffline(typeof navigator !== "undefined" && !navigator.onLine);
      setReceipt(result.transaction_id);
      setTimeout(() => setReceipt(null), 2500);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCharging(false);
    }
  }



  const mobileCartButton = (
    <button
      type="button"
      onClick={() => setMobileCartOpen(true)}
      className="relative inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover lg:hidden"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">Cart</span>
      {itemCount > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 font-mono-data text-[11px] font-bold text-secondary-foreground">
          {itemCount}
        </span>
      )}
    </button>
  );

  return (
    <AppShellWithSlot topBarSlot={mobileCartButton} hideBell>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:flex lg:gap-6 lg:px-8 lg:py-8">
        {/* Left: search + product list */}
        <section className="min-w-0 flex-1">
          {/* Desktop-only page heading */}
          <div className="hidden lg:block">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-[28px]">
              Point of Sale
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search to add medications to the cart.
            </p>
          </div>

          <div className="relative lg:mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medications…"
              className="h-12 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 lg:pr-12"
            />
            <button
              type="button"
              aria-label="Scan barcode"
              className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-primary hover:bg-primary-soft lg:grid"
            >
              <ScanLine className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop table */}
          <div className="mt-5 hidden overflow-x-auto rounded-lg border border-border bg-surface shadow-elev-sm md:block">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-surface-low">
                  <ThSm>Medication</ThSm>
                  <ThSm>Strength</ThSm>
                  <ThSm>Form</ThSm>
                  <ThSm align="right">Pack</ThSm>
                  <ThSm align="right">Stock</ThSm>
                  <ThSm align="right">Price</ThSm>
                  <ThSm className="w-16" />
                </tr>
              </thead>
              <tbody>
                {results.map((m) => {
                  const inCart = cart.some((l) => l.medId === m.id);
                  return (
                    <tr
                      key={m.id}
                      className={cn(
                        "border-t border-border transition-colors hover:bg-surface-low",
                        inCart && "bg-primary-soft/30",
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold">{m.name}</div>
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">{m.strength}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{m.form}</td>
                      <td className="px-5 py-3.5 text-right font-mono-data text-muted-foreground">
                        ×{m.packSize}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-baseline gap-1 rounded-md bg-surface-mid px-2 py-1">
                          <span className="font-mono-data text-sm font-bold">{m.stock}</span>
                          <span className="font-mono-data text-[10px] uppercase text-subtle-foreground">
                            units
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-data font-semibold text-primary">
                        ${m.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => addToCart(m)}
                          aria-label={`Add ${m.name} to cart`}
                          className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile result cards */}
          <div className="mt-5 space-y-3 md:hidden">
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addToCart(m)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-elev-sm active:bg-surface-low"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {m.name} {m.strength}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.form} · Pack ×{m.packSize}
                  </div>

                </div>
                <div className="text-right">
                  <div className="font-mono-data text-base font-bold text-primary">
                    ${m.price.toFixed(2)}
                  </div>
                  <div className="font-mono-data text-[11px] text-subtle-foreground">
                    Qty {m.stock}
                  </div>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Plus className="h-5 w-5" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Right: cart (desktop) */}
        <aside className="hidden w-[320px] shrink-0 lg:block xl:w-[380px]">
          <CartPanel
            lines={lines}
            subtotal={subtotal}
            total={total}

            onCharge={handleCharge}

            itemCount={itemCount}
            setQty={setQty}
            setBatch={setBatch}
            removeLine={removeLine}
          />
        </aside>
      </div>

      {/* Mobile cart sheet */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileCartOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-background pb-4 shadow-elev-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Cart ({itemCount} items)</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                aria-label="Close cart"
                className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pt-3">
              <CartPanel
                lines={lines}
                subtotal={subtotal}
                total={total}
                onCharge={handleCharge}

                itemCount={itemCount}
                setQty={setQty}
                setBatch={setBatch}
                removeLine={removeLine}
                embedded
              />
            </div>
          </div>
        </div>
      )}
      {charging && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elev-lg">
          Committing sale…
        </div>
      )}
      {receipt && (
        <div
          className={cn(
            "fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold shadow-elev-lg",
            queuedOffline
              ? "bg-warning-soft text-warning-soft-foreground"
              : "bg-success text-success-foreground",
          )}
        >
          {queuedOffline
            ? `Saved offline · syncs when online · ${receipt}`
            : `Sale committed · ${receipt}`}
        </div>
      )}
    </AppShellWithSlot>
  );
}


function ThSm({
  children,
  align,
  className,
}: {
  children?: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-5 py-2.5 font-mono-data text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function CartPanel({
  lines,
  subtotal,
  total,
  itemCount,
  setQty,
  setBatch,
  removeLine,
  onCharge,
  embedded,
}: {
  lines: { line: CartLine; med: Medication; batch: Batch }[];
  subtotal: number;
  total: number;
  itemCount: number;
  setQty: (medId: string, qty: number) => void;
  setBatch: (medId: string, batchId: string) => void;
  removeLine: (medId: string) => void;
  onCharge: () => void;
  embedded?: boolean;
}) {

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface shadow-elev-sm",
        !embedded && "sticky top-20 max-h-[calc(100vh-7rem)]",
        embedded && "border-0 shadow-none",
      )}
    >
      {!embedded && (
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Cart</h2>
            <span className="font-mono-data text-xs font-semibold text-subtle-foreground">
              ({itemCount} items)
            </span>
          </div>
          <button
            type="button"
            aria-label="Clear cart"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
      )}

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        {lines.length === 0 ? (
          <div className="grid h-48 place-items-center px-4 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-mid text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium">Cart is empty</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Scan or search to add an item.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map(({ med, line, batch }) => (
              <CartRow
                key={med.id}
                med={med}
                line={line}
                batch={batch}
                setQty={setQty}
                setBatch={setBatch}
                removeLine={removeLine}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border bg-surface-low px-5 py-4">
        <dl className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
          <div className="flex items-baseline justify-between border-t border-border pt-2.5">
            <dt className="text-base font-bold">Total</dt>
            <dd className="font-mono-data text-xl font-bold text-primary">
              ${total.toFixed(2)}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onCharge}
          disabled={lines.length === 0}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          Charge ${total.toFixed(2)}
        </button>

        <button
          type="button"
          disabled={lines.length === 0}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-mid hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Receipt className="h-4 w-4" />
          Hold ticket
        </button>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono-data font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function CartRow({
  med,
  line,
  batch,
  setQty,
  setBatch,
  removeLine,
}: {
  med: Medication;
  line: CartLine;
  batch: Batch;
  setQty: (medId: string, qty: number) => void;
  setBatch: (medId: string, batchId: string) => void;
  removeLine: (medId: string) => void;
}) {
  const [batchOpen, setBatchOpen] = useState(false);
  const lineTotal = med.price * line.qty;
  return (
    <li className="rounded-md border border-border bg-surface p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {med.name} {med.strength}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {med.form} · Pack ×{med.packSize}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-sm font-bold text-primary">
            ${lineTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Batch selector */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setBatchOpen((o) => !o)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-mono-data text-[11px] font-semibold transition-colors",
            batchOpen
              ? "bg-primary text-primary-foreground"
              : "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
          )}
        >
          Batch #{batch.batch_number}
          {med.releaseType !== "IR" && (
            <span className="rounded-full bg-secondary-soft px-1.5 py-0.5 font-mono-data text-[9px] font-bold uppercase tracking-wider text-secondary-soft-foreground">
              {med.releaseType}
            </span>
          )}
          {batch.expiringSoon && (
            <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-warning-soft-foreground">
              Soon
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", batchOpen && "rotate-180")} />
        </button>

        {batchOpen && (
          <div className="mt-2 space-y-1.5 rounded-md border border-border bg-surface-low p-2">
            <div className="px-1 pb-1 font-mono-data text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Select dispense batch
            </div>
            {med.batches.map((b) => {
              const selected = b.id === batch.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBatch(med.id, b.id);
                    setBatchOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border bg-surface px-3 py-2 text-left transition-colors",
                    selected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-surface-mid",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-xs font-bold">#{b.batch_number}</span>
                      {med.releaseType !== "IR" && (
                        <span className="rounded-full bg-secondary-soft px-1.5 py-0.5 font-mono-data text-[9px] font-bold uppercase tracking-wider text-secondary-soft-foreground">
                          {med.releaseType}
                        </span>
                      )}
                      {b.expiringSoon && (
                        <span className="rounded-full bg-warning-soft px-1.5 py-0.5 font-mono-data text-[9px] font-semibold uppercase tracking-wider text-warning-soft-foreground">
                          Expiring soon
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono-data text-[10px] text-subtle-foreground">
                      Exp {b.expiry} · Qty {b.quantity}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full border",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Qty controls */}
      <div className="mt-3 flex items-center justify-between">
        <div className="inline-flex h-9 items-center rounded-md border border-border bg-surface">
          <button
            type="button"
            onClick={() => setQty(med.id, line.qty - 1)}
            aria-label="Decrease quantity"
            className="grid h-full w-9 place-items-center text-muted-foreground hover:bg-surface-low hover:text-foreground"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="grid h-full min-w-10 place-items-center border-x border-border px-2 font-mono-data text-sm font-bold tabular-nums">
            {line.qty}
          </span>
          <button
            type="button"
            onClick={() => setQty(med.id, line.qty + 1)}
            aria-label="Increase quantity"
            className="grid h-full w-9 place-items-center text-muted-foreground hover:bg-surface-low hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => removeLine(med.id)}
          aria-label="Remove from cart"
          className="grid h-9 w-9 place-items-center rounded-md text-danger hover:bg-danger-soft"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
