import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import {
  LOW_STOCK_THRESHOLD,
  SUPPLIER_PRODUCTS,
  birr,
  type SupplierProduct,
} from "@/lib/supplier-mock";

export const Route = createFileRoute("/supplier/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Manage wholesale stock, batches and unit pricing for pharmacy partners.",
      },
      { property: "og:title", content: "Inventory · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Manage wholesale stock, batches and unit pricing for pharmacy partners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierInventory,
});

type Editing =
  | { mode: "add" }
  | { mode: "stock" | "price"; product: SupplierProduct }
  | null;

function SupplierInventory() {
  const [products, setProducts] = useState<SupplierProduct[]>(SUPPLIER_PRODUCTS);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing>(null);

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.batch_number}`.toLowerCase().includes(t),
    );
  }, [products, search]);

  return (
    <SupplierShell
      title="Inventory"
      subtitle="Wholesale catalog and batch stock"
      actions={
        <button
          onClick={() => setEditing({ mode: "add" })}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> Add new product
        </button>
      }
    >
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product, SKU or batch…"
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-elev-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border bg-surface-low text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Product</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Batch</th>
              <th className="px-5 py-3">Available qty</th>
              <th className="px-5 py-3">Unit price</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-4 font-semibold">{p.name}</td>
                <td className="px-5 py-4 font-mono-data text-xs">{p.sku}</td>
                <td className="px-5 py-4 font-mono-data text-xs">{p.batch_number}</td>
                <td className="px-5 py-4">
                  <span
                    className={
                      p.quantity <= LOW_STOCK_THRESHOLD
                        ? "rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger-soft-foreground"
                        : ""
                    }
                  >
                    {p.quantity.toLocaleString()}
                  </span>
                </td>
                <td className="px-5 py-4">{birr(p.unit_price)}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditing({ mode: "stock", product: p })}
                      className="h-9 rounded-md border border-border px-3 text-xs font-semibold hover:bg-surface-low"
                    >
                      Update stock
                    </button>
                    <button
                      onClick={() => setEditing({ mode: "price", product: p })}
                      className="h-9 rounded-md border border-border px-3 text-xs font-semibold hover:bg-surface-low"
                    >
                      Edit price
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <InventoryModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            setProducts((prev) => {
              const exists = prev.some((p) => p.id === next.id);
              return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [next, ...prev];
            });
            setEditing(null);
          }}
        />
      )}
    </SupplierShell>
  );
}

function InventoryModal({
  editing,
  onClose,
  onSave,
}: {
  editing: NonNullable<Editing>;
  onClose: () => void;
  onSave: (p: SupplierProduct) => void;
}) {
  const base: SupplierProduct =
    editing.mode === "add"
      ? {
          id: `sp-${Date.now()}`,
          name: "",
          sku: "",
          batch_number: "",
          quantity: 0,
          unit_price: 0,
          expiry_date: "",
        }
      : editing.product;
  const [form, setForm] = useState<SupplierProduct>(base);

  const title =
    editing.mode === "add"
      ? "Add new product"
      : editing.mode === "stock"
        ? "Update stock"
        : "Edit price";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="relative w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elev-lg"
      >
        <h2 className="text-lg font-bold">{title}</h2>

        {editing.mode === "add" && (
          <>
            <Field label="Product name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
            <Field
              label="Batch number"
              value={form.batch_number}
              onChange={(v) => setForm({ ...form, batch_number: v })}
            />
            <Field
              label="Expiry date"
              type="date"
              value={form.expiry_date}
              onChange={(v) => setForm({ ...form, expiry_date: v })}
            />
          </>
        )}

        {editing.mode !== "price" && (
          <Field
            label="Available quantity"
            type="number"
            value={String(form.quantity)}
            onChange={(v) => setForm({ ...form, quantity: Number(v) })}
          />
        )}

        {editing.mode !== "stock" && (
          <Field
            label="Unit price (ETB)"
            type="number"
            value={String(form.unit_price)}
            onChange={(v) => setForm({ ...form, unit_price: Number(v) })}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface-low"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none ring-primary/30 focus:ring-2"
      />
    </label>
  );
}
