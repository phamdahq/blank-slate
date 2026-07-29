import { useState } from "react";
import { X, Save, WifiOff } from "lucide-react";
import { inventoryRepo } from "@/db/repositories";
import { useOnline } from "@/hooks/use-online";
import { currentUserId } from "@/hooks/use-auth";
import type { Batch } from "@/db/dexie";

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Offline-capable "Add Batch" flow. Writes locally via `inventoryRepo.addBatch`
 * which enqueues an outbox op — the sync engine drains it whenever the browser
 * is next online. No network round-trip required on submit.
 */
export function AddBatchModal({ productId, productName, onClose, onSaved }: Props) {
  const online = useOnline();
  const [batchNumber, setBatchNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const pharmacy_id = currentUserId() ?? "local-pharmacy";
      const batch: Batch = {
        id: crypto.randomUUID(),
        pharmacy_id,
        product_id: productId,
        batch_number: batchNumber,
        supplier_name: supplier || null,
        expiry_date: expiry,
        quantity: Number(quantity) || 0,
        purchase_cost: Number(cost) || 0,
        selling_price: Number(price) || 0,
        created_at: new Date().toISOString(),
      };
      await inventoryRepo.addBatch(batch);
      onSaved?.();
      onClose();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-surface shadow-elev-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">Add batch</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{productName}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-mid"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!online && (
          <div className="flex items-center gap-2 border-b border-border bg-warning-soft/60 px-5 py-2.5 text-xs text-warning-soft-foreground">
            <WifiOff className="h-3.5 w-3.5" />
            You're offline — batch will save locally and sync automatically.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <Field label="Batch number" required>
            <input
              required
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="B-2026-X90"
              className={inputCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expiry date" required>
              <input
                required
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Quantity" required>
              <input
                required
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Cost price">
              <input
                type="number"
                step="0.01"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Selling price" required>
              <input
                required
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Supplier">
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
              className={inputCls}
            />
          </Field>

          {err && (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{err}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-muted-foreground hover:bg-surface-mid hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}