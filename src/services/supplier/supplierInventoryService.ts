/**
 * Supplier wholesale stock (`supplier_batches`) CRUD, joined with the global
 * product catalog (`products`).
 */
import { supabase } from "@/lib/supabase";

export interface CatalogProduct {
  id: string;
  name: string;
  strength: string | null;
  dosage_form: string | null;
  uom: string | null;
  label: string;
}

export interface SupplierStockRow {
  id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_cost: number;
  selling_price: number;
  created_at: string | null;
}

export interface NewSupplierBatch {
  product_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_cost: number;
  selling_price: number;
}

function productLabel(p: {
  name?: string;
  strength?: string | null;
  dosage_form?: string | null;
}): string {
  return [p.name, p.strength, p.dosage_form].filter(Boolean).join(" ") || "Unknown product";
}

export async function fetchSupplierStock(
  supplierId: string,
  search = "",
): Promise<SupplierStockRow[]> {
  const { data, error } = await supabase
    .from("supplier_batches")
    .select(
      "id, product_id, batch_number, expiry_date, quantity, purchase_cost, selling_price, created_at, products(name, strength, dosage_form)",
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r["id"] as string,
    product_id: (r["product_id"] as string) ?? "",
    product_name: productLabel((r["products"] as Record<string, string> | null) ?? {}),
    batch_number: (r["batch_number"] as string) ?? "",
    expiry_date: (r["expiry_date"] as string) ?? "",
    quantity: Number(r["quantity"] ?? 0),
    purchase_cost: Number(r["purchase_cost"] ?? 0),
    selling_price: Number(r["selling_price"] ?? 0),
    created_at: (r["created_at"] as string | null) ?? null,
  }));

  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((r) => `${r.product_name} ${r.batch_number}`.toLowerCase().includes(term));
}

/** Global catalog lookup used by the "add product" flow. */
export async function searchCatalog(term: string, limit = 25): Promise<CatalogProduct[]> {
  let q = supabase
    .from("products")
    .select("id, name, strength, dosage_form, UOM")
    .order("name")
    .limit(limit);
  const t = term.trim();
  if (t) q = q.ilike("name", `%${t}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r["id"] as string,
    name: (r["name"] as string) ?? "",
    strength: (r["strength"] as string | null) ?? null,
    dosage_form: (r["dosage_form"] as string | null) ?? null,
    uom: (r["UOM"] as string | null) ?? null,
    label: productLabel(r as Record<string, string>),
  }));
}

export async function addSupplierBatch(
  supplierId: string,
  input: NewSupplierBatch,
): Promise<SupplierStockRow> {
  const { data, error } = await supabase
    .from("supplier_batches")
    .insert({
      supplier_id: supplierId,
      product_id: input.product_id,
      batch_number: input.batch_number.trim(),
      expiry_date: input.expiry_date,
      quantity: input.quantity,
      purchase_cost: input.purchase_cost,
      selling_price: input.selling_price,
    })
    .select(
      "id, product_id, batch_number, expiry_date, quantity, purchase_cost, selling_price, created_at, products(name, strength, dosage_form)",
    )
    .single();

  if (error) throw new Error(error.message);
  const r = data as Record<string, unknown>;
  return {
    id: r["id"] as string,
    product_id: r["product_id"] as string,
    product_name: productLabel((r["products"] as Record<string, string> | null) ?? {}),
    batch_number: r["batch_number"] as string,
    expiry_date: r["expiry_date"] as string,
    quantity: Number(r["quantity"] ?? 0),
    purchase_cost: Number(r["purchase_cost"] ?? 0),
    selling_price: Number(r["selling_price"] ?? 0),
    created_at: (r["created_at"] as string | null) ?? null,
  };
}

export async function updateBatchQuantity(batchId: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from("supplier_batches")
    .update({ quantity })
    .eq("id", batchId);
  if (error) throw new Error(error.message);
}

export async function updateBatchPricing(
  batchId: string,
  purchaseCost: number,
  sellingPrice: number,
): Promise<void> {
  const { error } = await supabase
    .from("supplier_batches")
    .update({ purchase_cost: purchaseCost, selling_price: sellingPrice })
    .eq("id", batchId);
  if (error) throw new Error(error.message);
}

export async function deleteSupplierBatch(batchId: string): Promise<void> {
  const { error } = await supabase.from("supplier_batches").delete().eq("id", batchId);
  if (error) throw new Error(error.message);
}
