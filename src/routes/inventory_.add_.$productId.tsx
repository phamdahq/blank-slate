import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Pill,
  Save,
  Lock,
} from "lucide-react";
import { z } from "zod";
import { AppShellWithSlot } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import { fetchGlobalProduct, OfflineError } from "@/db/catalog-remote";
import { db } from "@/db/dexie";
import { addFirstBatch, addAdditionalBatch } from "@/services/inventory/stockService";
import { LOW_STOCK_LEVEL } from "@/lib/catalog";
import type { Product } from "@/db/dexie";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["first", "batch"]).optional().default("first"),
});

export const Route = createFileRoute("/inventory_/add_/$productId")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Add Stock · PharmaCore" },
      {
        name: "description",
        content:
          "Register a new batch of a selected medicine with stock, expiry, and pricing details.",
      },
    ],
  }),
  component: AddMedicinePage,
});

function AddMedicinePage() {
  return (
    <RequireRole roles={["owner"]}>
      <AddMedicineForm />
    </RequireRole>
  );
}

function AddMedicineForm() {
  const router = useRouter();
  const { productId } = Route.useParams();
  const { pharmacyId } = useSession();

  // The product MUST exist upstream in Supabase. Custom/unknown items are
  // rejected — this validation step requires connectivity by design.
  const [med, setMed] = useState<Product | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [batchNumber, setBatchNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reorder, setReorder] = useState<number | "">(LOW_STOCK_LEVEL);
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [supplier, setSupplier] = useState("");

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setValidating(true);
    setValidationError(null);
    void fetchGlobalProduct(productId)
      .then((p) => {
        if (cancelled) return;
        if (!p) setValidationError("This product no longer exists in the global catalog.");
        setMed(p);
      })
      .catch((err) => {
        if (cancelled) return;
        setValidationError(
          err instanceof OfflineError
            ? "You must be online to add stock — products are validated against the global catalog."
            : err instanceof Error
              ? err.message
              : "Could not validate this product.",
        );
      })
      .finally(() => {
        if (!cancelled) setValidating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!med || !pharmacyId) {
      setSaveError("Missing pharmacy or product context.");
      return;
    }
    setSaveError(null);
    try {
      // Local-first write; the outbox syncs to Supabase now or when back online.
      await inventoryRepo.addBatch({
        id: crypto.randomUUID(),
        pharmacy_id: pharmacyId,
        product_id: med.id,
        batch_number: batchNumber.trim(),
        supplier_name: supplier.trim() || null,
        expiry_date: expiry,
        quantity: Number(quantity) || 0,
        purchase_cost: Number(cost) || 0,
        selling_price: Number(price) || 0,
        created_at: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => router.navigate({ to: "/inventory" }), 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this batch.");
    }
  }

  if (validating) {
    return (
      <AppShellWithSlot hideBell>
        <div className="grid min-h-[50vh] place-items-center px-4 text-sm text-muted-foreground">
          Validating product against the global catalog…
        </div>
      </AppShellWithSlot>
    );
  }

  if (!med) {
    return (
      <AppShellWithSlot hideBell>
        <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 text-center">
          <div>
            <p className="text-sm text-danger">{validationError}</p>
            <Link
              to="/inventory/add"
              className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Back to product picker
            </Link>
          </div>
        </div>
      </AppShellWithSlot>
    );
  }

  return (
    <AppShellWithSlot hideBell>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mx-auto w-full max-w-[1100px] px-4 py-5 pb-32 sm:px-6 lg:px-8 lg:py-8 lg:pb-8"
      >
        <Link
          to="/inventory/add"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to product picker
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]">
              Add Stock
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Register a new batch for the selected product.
            </p>
          </div>
          <span className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 font-mono-data text-[11px] font-bold uppercase tracking-wider text-success-soft-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Catalog verified
          </span>
        </div>

        <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
          {/* 1. Product identification (locked) */}
          <SectionCard icon={Pill} title="Product identification">
            <div className="flex items-start gap-2 rounded-md bg-primary-soft/40 p-3 text-[11px] text-primary-soft-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Locked to the global catalog entry you selected. To change,
                <Link to="/inventory/add" className="ml-1 font-semibold underline">
                  pick a different product
                </Link>
                .
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReadOnly label="Medicine name" value={med.name} />
              <ReadOnly label="Generic name" value={med.generic_name ?? "—"} />
              <ReadOnly label="Dosage form" value={med.dosage_form ?? "—"} />
              <ReadOnly label="Strength" value={med.strength ?? "—"} />
              <ReadOnly label="Release type" value={med.release_type ?? "IR"} />
              <ReadOnly label="Unit of measure" value={med.UOM} />
            </dl>
          </SectionCard>

          {/* 2. Batch & logistics */}
          <SectionCard icon={ClipboardCheck} title="Batch & logistics">
            <div className="space-y-4">
              <Field label="Batch number" required>
                <input
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="B-2026-X90"
                  className={cn(inputCls, "font-mono-data")}
                />
              </Field>
              <Field label="Expiry date" required>
                <input
                  required
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current stock" required>
                  <input
                    required
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
                <Field label="Reorder level">
                  <input
                    type="number"
                    min={0}
                    value={reorder}
                    onChange={(e) =>
                      setReorder(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="10"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* 3. Pricing & supplier */}
          <SectionCard icon={CreditCard} title="Pricing & supplier">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cost price">
                  <MoneyInput value={cost} onChange={setCost} />
                </Field>
                <Field label="Selling price" required>
                  <MoneyInput value={price} onChange={setPrice} required />
                </Field>
              </div>
              <Field label="Supplier" required>
                <input
                  required
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Search name"
                  className={inputCls}
                />
              </Field>
            </div>
          </SectionCard>
        </div>

        {saveError && (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {saveError}
          </p>
        )}

        {/* Sticky footer actions */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:relative lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-[1100px] items-center justify-end gap-3 pb-[env(safe-area-inset-bottom)] lg:pb-0">
            <Link
              to="/inventory"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-mid hover:text-foreground sm:flex-initial"
            >
              Discard
            </Link>
            <button
              type="submit"
              disabled={saved}
              className="inline-flex h-11 flex-[2] items-center justify-center gap-1.5 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 sm:flex-initial"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Item
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </AppShellWithSlot>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Pill;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-elev-sm sm:p-6">
      <header className="flex items-center gap-2 border-b border-border pb-3 sm:pb-4">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
          {title}
        </h2>
      </header>
      <div className="pt-4 sm:pt-5">{children}</div>
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex h-11 items-center rounded-md border border-border bg-surface-low px-3 text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

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

function MoneyInput({
  value,
  onChange,
  required,
}: {
  value: number | "";
  onChange: (v: number | "") => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono-data text-sm font-semibold text-subtle-foreground">
        $
      </span>
      <input
        required={required}
        type="number"
        step="0.01"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder="0.00"
        className={cn(inputCls, "pl-7 font-mono-data")}
      />
    </div>
  );
}

const inputCls =
  "flex h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
