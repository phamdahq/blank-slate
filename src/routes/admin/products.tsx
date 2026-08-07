import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCard } from "@/components/admin/admin-primitives";
import { cn } from "@/lib/utils";
import {
  createGlobalProductWithPack,
  listGlobalCatalog,
  updateGlobalProduct,
  type GlobalProduct,
  type GlobalProductWithPacks,
} from "@/services/admin/productService";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Global Product Catalog · Phamda Master Console" },
      {
        name: "description",
        content:
          "Master repository of every medicine on Phamda — edit once, propagate to all pharmacy inventories.",
      },
      { property: "og:title", content: "Global Product Catalog · Phamda Master Console" },
      {
        property: "og:description",
        content:
          "Master repository of every medicine on Phamda — edit once, propagate to all pharmacy inventories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

type Category = NonNullable<GlobalProduct["category"]>;

const CATEGORIES: Array<{ value: Category; label: string; tone: string }> = [
  { value: "pharmaceutical", label: "Pharmaceutical", tone: "bg-primary-soft text-primary" },
  { value: "cosmetic", label: "Cosmetic", tone: "bg-warning-soft text-warning" },
  { value: "medical_device", label: "Medical device", tone: "bg-success-soft text-success" },
  { value: "supplies", label: "Supplies", tone: "bg-surface-low text-muted-foreground" },
];

const RELEASE_TYPES = ["IR", "DR", "ER", "ODT"] as const;
const PAGE_SIZES = [10, 20, 50];

function ProductsPage() {
  const [rows, setRows] = useState<GlobalProductWithPacks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<GlobalProductWithPacks | "new" | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listGlobalCatalog());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.category ?? "", (map.get(r.category ?? "") ?? 0) + 1));
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.category !== filter) return false;
      if (!term) return true;
      return (
        r.name.toLowerCase().includes(term) ||
        (r.generic_name ?? "").toLowerCase().includes(term) ||
        (r.strength ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  const from = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, filtered.length);

  useEffect(() => setPage(1), [search, filter, pageSize]);

  return (
    <AdminShell
      title="Phamda Master Console"
      searchPlaceholder="Search medicine by name or generic…"
      search={search}
      onSearchChange={setSearch}
    >
      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Global Product Catalog
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The master repository for the pharmaceutical ecosystem. Changes here propagate to all
            linked pharmacy inventories globally.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            title="Bulk import is coming soon"
            className="inline-flex h-12 items-center gap-2 rounded-lg border-2 border-primary px-4 text-sm font-bold text-primary disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" />
            Bulk Import
          </button>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Create New Global Item
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="relative mt-4 md:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicine…"
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <AdminCard className="mt-5 overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <span className="font-mono-data text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Filter by:
          </span>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All Products ({rows.length})
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
              {c.label} ({counts.get(c.value) ?? 0})
            </Chip>
          ))}
          <span className="ml-auto hidden font-mono-data text-xs italic text-muted-foreground lg:block">
            Showing {from}-{to} of {filtered.length}
          </span>
        </div>

        {loading ? (
          <div className="grid min-h-[280px] place-items-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading catalog…
          </div>
        ) : error ? (
          <div className="grid min-h-[280px] place-items-center p-10 text-center">
            <div>
              <AlertTriangle className="mx-auto h-6 w-6 text-danger" />
              <p className="mt-3 text-sm font-semibold text-foreground">{error}</p>
              <button
                onClick={() => void refresh()}
                className="mt-4 h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface-low"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center p-10 text-center">
            <div>
              <p className="text-sm font-semibold text-foreground">No products match your filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or create a new global item.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead className="bg-surface-low">
                  <tr className="font-mono-data text-xs uppercase tracking-wider text-muted-foreground">
                    <Th className="pl-5">Product name</Th>
                    <Th>Generic name</Th>
                    <Th>Strength / Dosage</Th>
                    <Th>Pack size</Th>
                    <Th>Categories</Th>
                    <Th className="pr-5 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => (
                    <tr key={p.id} className="border-t border-border align-middle hover:bg-surface-low/60">
                      <td className="px-4 py-4 pl-5 text-sm font-bold text-foreground">{p.name}</td>
                      <td className="px-4 py-4 text-sm italic text-muted-foreground">
                        {p.generic_name ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-foreground">{p.strength ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.dosage_form ?? "—"}</p>
                      </td>
                      <td className="px-4 py-4 font-mono-data text-sm text-foreground">
                        {p.pack_sizes.length ? p.pack_sizes.map((s) => `${s}x`).join(", ") : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CategoryPill category={p.category} />
                          <ReleasePill release={p.release_type} />
                        </div>
                      </td>
                      <td className="px-4 py-4 pr-5 text-right">
                        <button
                          onClick={() => setEditing(p)}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit Master
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {paged.map((p) => (
                <li key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                      <p className="truncate text-xs italic text-muted-foreground">
                        {p.generic_name ?? "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditing(p)}
                      aria-label={`Edit ${p.name}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono-data text-xs text-muted-foreground">
                    <span className="rounded bg-surface-low px-2 py-1 font-semibold text-foreground">
                      {p.strength ?? "—"} {p.dosage_form ? `· ${p.dosage_form}` : ""}
                    </span>
                    <span className="rounded bg-surface-low px-2 py-1">
                      Pack {p.pack_sizes.length ? p.pack_sizes.map((s) => `${s}x`).join(", ") : "—"}
                    </span>
                    <CategoryPill category={p.category} />
                    <ReleasePill release={p.release_type} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer / pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-5">
              <label className="flex items-center gap-2 font-mono-data text-sm text-foreground">
                Show
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} rows
                    </option>
                  ))}
                </select>
              </label>
              <p className="font-mono-data text-sm text-muted-foreground">
                Page {current} of {pageCount}
              </p>
              <div className="flex items-center gap-2">
                <PagerButton disabled={current <= 1} onClick={() => setPage(current - 1)} label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </PagerButton>
                <PagerButton
                  disabled={current >= pageCount}
                  onClick={() => setPage(current + 1)}
                  label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </PagerButton>
              </div>
            </div>
          </>
        )}
      </AdminCard>

      {editing && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </AdminShell>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-bold", className)}>{children}</th>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 whitespace-nowrap rounded-full px-4 text-xs font-bold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CategoryPill({ category }: { category: GlobalProduct["category"] }) {
  const meta = CATEGORIES.find((c) => c.value === category);
  if (!meta) return <span className="text-xs text-muted-foreground">Uncategorised</span>;
  return (
    <span
      className={cn(
        "rounded px-2 py-1 font-mono-data text-[11px] font-bold uppercase tracking-wide",
        meta.tone,
      )}
    >
      {meta.label}
    </span>
  );
}

function ReleasePill({ release }: { release: string | null }) {
  if (!release || release === "IR") return null;
  return (
    <span className="rounded bg-warning-soft px-2 py-1 font-mono-data text-[11px] font-bold uppercase tracking-wide text-warning">
      {release}
    </span>
  );
}

function PagerButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-low disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// ---------------- Create / edit dialog ----------------

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: GlobalProductWithPacks | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [generic, setGeneric] = useState(product?.generic_name ?? "");
  const [dosage, setDosage] = useState(product?.dosage_form ?? "");
  const [strength, setStrength] = useState(product?.strength ?? "");
  const [uom, setUom] = useState(product?.UOM ?? "unit");
  const [release, setRelease] = useState(product?.release_type ?? "IR");
  const [category, setCategory] = useState<Category>(product?.category ?? "pharmaceutical");
  const [packSize, setPackSize] = useState(product?.pack_sizes[0]?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      generic_name: generic.trim() || null,
      dosage_form: dosage.trim() || null,
      strength: strength.trim() || null,
      UOM: uom.trim() || "unit",
      release_type: release,
      category,
    };
    try {
      if (product) await updateGlobalProduct(product.id, payload);
      else await createGlobalProductWithPack(payload, packSize ? Number(packSize) : null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this product.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6">
      <form
        onSubmit={save}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-elev-lg sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-foreground">
              {product ? "Edit master item" : "Create new global item"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This record is shared across every pharmacy on the platform.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-surface-low"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Product name" className="sm:col-span-2">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amoxicillin Cap"
              className={inputCls}
            />
          </Field>
          <Field label="Generic name" className="sm:col-span-2">
            <input
              value={generic}
              onChange={(e) => setGeneric(e.target.value)}
              placeholder="Amoxicillin Trihydrate"
              className={inputCls}
            />
          </Field>
          <Field label="Strength">
            <input
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder="500mg"
              className={inputCls}
            />
          </Field>
          <Field label="Dosage form">
            <input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Capsule"
              className={inputCls}
            />
          </Field>
          <Field label="Unit of measure">
            <input
              required
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              placeholder="tablet"
              className={inputCls}
            />
          </Field>
          <Field label="Release type">
            <select value={release} onChange={(e) => setRelease(e.target.value)} className={inputCls}>
              {RELEASE_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          {!product && (
            <Field label="Pack size">
              <input
                type="number"
                min={1}
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="30"
                className={inputCls}
              />
            </Field>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-md border border-border px-5 text-sm font-semibold hover:bg-surface-low"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {product ? "Save changes" : "Create item"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
