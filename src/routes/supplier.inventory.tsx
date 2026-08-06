import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { SupplierShell, SupplierState } from "@/components/supplier/supplier-shell";
import { LOW_STOCK_THRESHOLD, birr } from "@/lib/supplier-format";
import type { SupplierStockRow } from "@/services/supplier/supplierInventoryService";
import {
  useAddBatch,
  useCatalogSearch,
  useDeleteBatch,
  useSupplierContext,
  useSupplierStock,
  useUpdateBatchPricing,
  useUpdateBatchQuantity,
} from "@/hooks/use-supplier";

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

type Editing = { mode: "add" } | { mode: "stock" | "price"; row: SupplierStockRow } | null;

function SupplierInventory() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing>(null);

  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useSupplierContext();
  const { data, isLoading, error } = useSupplierStock(ctx?.supplierId, search);
  const removeBatch = useDeleteBatch();

  const rows = data ?? [];
  const busy = ctxLoading || isLoading;
  const err = ctxError ?? error;

  return (
    <SupplierShell
      title="Inventory"
      subtitle="Wholesale catalog and batch stock"
      actions={
        <button
          onClick={() => setEditing({ mode: "add" })}
          disabled={!ctx}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
          placeholder="Search product or batch…"
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
        />
      </div>

      {(busy || err) && <SupplierState loading={busy} error={err} />}

      {!busy && !err && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-elev-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-border bg-surface-low text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Batch</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">Available qty</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3">Selling price</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 font-semibold">{p.product_name}</td>
                  <td className="px-5 py-4 font-mono-data text-xs">{p.batch_number}</td>
                  <td className="px-5 py-4 text-muted-foreground">{p.expiry_date}</td>
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
                  <td className="px-5 py-4">{birr(p.purchase_cost)}</td>
                  <td className="px-5 py-4">{birr(p.selling_price)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing({ mode: "stock", row: p })}
                        className="h-9 rounded-md border border-border px-3 text-xs font-semibold hover:bg-surface-low"
                      >
                        Update stock
                      </button>
                      <button
                        onClick={() => setEditing({ mode: "price", row: p })}
                        className="h-9 rounded-md border border-border px-3 text-xs font-semibold hover:bg-surface-low"
                      >
                        Edit price
                      </button>
                      <button
                        aria-label="Delete batch"
                        onClick={() => removeBatch.mutate(p.id)}
                        className="grid h-9 w-9 place-items-center rounded-md border border-border text-danger hover:bg-danger-soft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No stock batches yet. Add your first product to start selling.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing?.mode === "add" && ctx && (
        <AddProductModal supplierId={ctx.supplierId} onClose={() => setEditing(null)} />
      )}
      {editing && editing.mode !== "add" && (
        <EditBatchModal mode={editing.mode} row={editing.row} onClose={() => setEditing(null)} />
      )}
    </SupplierShell>
  );
}

function AddProductModal({
  supplierId,
  onClose,
}: {
  supplierId: string;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [productId, setProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [cost, setCost] = useState("0");
  const [price, setPrice] = useState("0");

  const { data: catalog, isLoading } = useCatalogSearch(term, true);
  const addBatch = useAddBatch(supplierId);

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addBatch.mutate(
            {
              product_id: productId,
              batch_number: batchNumber,
              expiry_date: expiry,
              quantity: Number(quantity),
              purchase_cost: Number(cost),
              selling_price: Number(price),
            },
            { onSuccess: onClose },
          );
        }}
        className="space-y-4"
      >
        <h2 className="text-lg font-bold">Add new product batch</h2>

        <Field label="Search catalog" value={term} onChange={setTerm} />
        <label className="block text-sm">
          <span className="font-semibold">Product</span>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="">{isLoading ? "Loading…" : "Select a product"}</option>
            {(catalog ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <Field label="Batch number" value={batchNumber} onChange={setBatchNumber} required />
        <Field label="Expiry date" type="date" value={expiry} onChange={setExpiry} required />
        <Field label="Quantity" type="number" value={quantity} onChange={setQuantity} required />
        <Field label="Purchase cost (ETB)" type="number" value={cost} onChange={setCost} required />
        <Field label="Selling price (ETB)" type="number" value={price} onChange={setPrice} required />

        <Actions onClose={onClose} saving={addBatch.isPending} />
      </form>
    </Modal>
  );
}

function EditBatchModal({
  mode,
  row,
  onClose,
}: {
  mode: "stock" | "price";
  row: SupplierStockRow;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [cost, setCost] = useState(String(row.purchase_cost));
  const [price, setPrice] = useState(String(row.selling_price));

  const updateQty = useUpdateBatchQuantity();
  const updatePricing = useUpdateBatchPricing();
  const saving = updateQty.isPending || updatePricing.isPending;

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "stock") {
            updateQty.mutate({ id: row.id, quantity: Number(quantity) }, { onSuccess: onClose });
          } else {
            updatePricing.mutate(
              { id: row.id, purchase_cost: Number(cost), selling_price: Number(price) },
              { onSuccess: onClose },
            );
          }
        }}
        className="space-y-4"
      >
        <h2 className="text-lg font-bold">
          {mode === "stock" ? "Update stock" : "Edit pricing"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {row.product_name} · batch {row.batch_number}
        </p>

        {mode === "stock" ? (
          <Field label="Available quantity" type="number" value={quantity} onChange={setQuantity} />
        ) : (
          <>
            <Field label="Purchase cost (ETB)" type="number" value={cost} onChange={setCost} />
            <Field label="Selling price (ETB)" type="number" value={price} onChange={setPrice} />
          </>
        )}

        <Actions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <button aria-label="Close" className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-elev-lg">
        {children}
      </div>
    </div>
  );
}

function Actions({ onClose, saving }: { onClose: () => void; saving: boolean }) {
  return (
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
        disabled={saving}
        className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none ring-primary/30 focus:ring-2"
      />
    </label>
  );
}
