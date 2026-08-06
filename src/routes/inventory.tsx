import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ScanLine,
  MoreVertical,
  TrendingDown,
  AlertTriangle,
  Plus,
  PackagePlus,
} from "lucide-react";

import { AppShellWithSlot } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import {
  categories,
  categoryLabels,
  stockStatus,
  useCatalog,
  type Medication,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";



export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · PharmaCore" },
      {
        name: "description",
        content:
          "Track medication stock, batches, and expiry across your pharmacy in real time.",
      },
      { property: "og:title", content: "Inventory · PharmaCore" },
      {
        property: "og:description",
        content: "Pharmacy inventory management with batch and expiry tracking.",
      },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  // Inventory + batch management is owner-only; staff are blocked.
  return (
    <RequireRole roles={["owner"]}>
      <InventoryView />
    </RequireRole>
  );
}

function InventoryView() {
  const { pharmacyId, loading } = useSession();
  const medications = useCatalog(pharmacyId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return medications.filter((m) => {
      const matchesCat = category === "All" || m.category === category;
      const matchesQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.ndc.includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, category, medications]);

  const totalUnits = medications.reduce((s, m) => s + m.stock, 0);


  const headerAdd = (
    <Link
      to="/inventory/add"
      aria-label="Add stock"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      <Plus className="h-[18px] w-[18px]" />
    </Link>
  );

  if (loading || !pharmacyId) {
    return (
      <AppShellWithSlot topBarSlot={headerAdd} hideBell>
        <div className="grid min-h-[60vh] place-items-center px-4">
          <p className="text-sm text-muted-foreground">Loading inventory…</p>
        </div>
      </AppShellWithSlot>
    );
  }

  return (
    <AppShellWithSlot topBarSlot={headerAdd} hideBell>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Page header */}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-[28px]">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono-data">{filtered.length}</span> of{" "}
            <span className="font-mono-data">{medications.length}</span> medications ·{" "}
            <span className="font-mono-data">{totalUnits.toLocaleString()}</span> total units
          </p>
        </div>


        {/* Search + filter */}
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine by brand, generic, or NDC…"
              className="h-12 w-full rounded-full border border-border bg-surface pl-11 pr-12 text-sm outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <button
              type="button"
              aria-label="Scan barcode"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-primary hover:bg-primary-soft"
            >
              <ScanLine className="h-5 w-5" />
            </button>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 pb-1">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {categoryLabels[c]}

                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="mt-5 hidden overflow-hidden rounded-lg border border-border bg-surface shadow-elev-sm md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low">
                <Th>Medication</Th>
                <Th>Strength</Th>
                <Th>Form</Th>
                <Th align="right">Pack</Th>
                <Th align="right">Current stock</Th>
                <Th align="right">Reorder level</Th>
                <Th align="right">Price</Th>
                <Th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const status = stockStatus(m);
                return (
                  <tr
                    key={m.id}
                    className="border-t border-border transition-colors hover:bg-surface-low"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{m.name}</div>
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">{m.strength}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <FormPill form={m.form} />
                        {m.releaseType !== "IR" && <ReleasePill type={m.releaseType} />}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono-data text-muted-foreground">
                      ×{m.packSize}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StockValue value={m.stock} status={status} />
                    </td>
                    <td className="px-5 py-4 text-right font-mono-data text-muted-foreground">
                      {m.reorderLevel.toLocaleString()} units
                    </td>
                    <td className="px-5 py-4 text-right font-mono-data font-semibold text-primary">
                      {m.price.toFixed(2)} ETB
                    </td>
                    <td className="px-3 py-4 text-right">
                      <RowActions productId={m.id} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No medications match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border bg-surface-low px-5 py-3 text-sm text-muted-foreground">
            <div>
              Showing <span className="font-mono-data text-foreground">1–{filtered.length}</span>{" "}
              of <span className="font-mono-data text-foreground">{filtered.length}</span> entries
            </div>
          </div>
        </div>

        {/* Mobile list */}
        <div className="mt-5 space-y-3 md:hidden">
          {filtered.map((m) => (
            <MobileMedRow key={m.id} med={m} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-surface py-12 text-center text-sm text-muted-foreground">
              No medications match your search.
            </div>
          )}
        </div>
      </div>
    </AppShellWithSlot>
  );
}

function RowActions({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Row actions"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-mid hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-surface shadow-elev-md">
          <Link
            to="/inventory/add/$productId"
            params={{ productId }}
            search={{ mode: "batch" }}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-low"
          >
            <PackagePlus className="h-4 w-4 text-primary" />
            Add Batch
          </Link>
        </div>
      )}
    </div>
  );
}

function Th({
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
        "px-5 py-3 font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function FormPill({ form }: { form: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-primary-soft px-2.5 font-mono-data text-[11px] font-semibold text-primary-soft-foreground">
      {form}
    </span>
  );
}

function ReleasePill({ type }: { type: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-secondary/30 bg-secondary-soft px-2 font-mono-data text-[10px] font-bold uppercase tracking-wider text-secondary-soft-foreground">
      {type}
    </span>
  );
}

function StockValue({
  value,
  status,
}: {
  value: number;
  status: "critical" | "low" | "ok" | "high";
}) {
  if (status === "critical")
    return (
      <span className="inline-flex items-center gap-1.5 font-mono-data text-base font-bold text-danger">
        {value} <TrendingDown className="h-4 w-4" />
      </span>
    );
  if (status === "low")
    return (
      <span className="inline-flex items-center gap-1.5 font-mono-data text-base font-bold text-warning-soft-foreground">
        {value} <AlertTriangle className="h-4 w-4" />
      </span>
    );
  return (
    <span className="font-mono-data text-base font-bold text-foreground">
      {value.toLocaleString()}{" "}
      <span className="text-[11px] font-medium text-subtle-foreground">units</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-elev-sm">
      <div className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning-soft-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function MobileMedRow({ med }: { med: Medication }) {
  const status = stockStatus(med);
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 shadow-elev-sm transition-colors",
        status === "critical"
          ? "border-l-4 border-l-danger border-danger/30 bg-danger-soft/40"
          : "border-border",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground">
              {med.name} {med.strength}
            </h3>
            {status === "critical" && (
              <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 font-mono-data text-[10px] font-bold uppercase tracking-wider text-danger-foreground">
                Critical
              </span>
            )}
            {status === "low" && (
              <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 font-mono-data text-[10px] font-bold uppercase tracking-wider text-warning-soft-foreground">
                Low
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{med.form}</span>
            {med.releaseType !== "IR" && <ReleasePill type={med.releaseType} />}
            <span>· Pack ×{med.packSize}</span>
          </div>
        </div>

        <div className="text-right">
          <div
            className={cn(
              "font-mono-data text-xl font-bold tabular-nums",
              status === "critical" ? "text-danger" : "text-foreground",
            )}
          >
            {med.stock.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {med.form === "Tablet" ? "Tablets" : med.form === "Capsule" ? "Capsules" : "Units"}
          </div>
          <div className="mt-2 font-mono-data text-sm font-semibold text-primary">
            {med.price.toFixed(2)} ETB
          </div>
        </div>
      </div>
    </div>
  );
}

