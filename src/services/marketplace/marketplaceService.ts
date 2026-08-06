/**
 * Supplier Marketplace service (online-only).
 *
 * Retail pharmacies browse live supplier stock (`supplier_batches` joined to
 * `products` and `suppliers`) and place purchase orders that land in
 * `pharmacies_purchase_orders` + `pharmacy_purchase_order_items` with a
 * "Pending" status for the supplier to approve.
 */
import { supabase } from "@/lib/supabase";

export type ProductCategory =
  | "pharmaceutical"
  | "cosmetic"
  | "medical_device"
  | "supplies";

export const CATEGORIES: ProductCategory[] = [
  "pharmaceutical",
  "cosmetic",
  "medical_device",
  "supplies",
];

export interface MarketplaceSupplier {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface MarketplaceListing {
  /** supplier_batches.id */
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_city: string | null;
  product_id: string;
  product_name: string;
  generic_name: string | null;
  dosage_form: string | null;
  strength: string | null;
  uom: string | null;
  category: ProductCategory | null;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  selling_price: number;
}

export interface MarketplaceFilters {
  search?: string;
  supplierId?: string | "all";
  category?: ProductCategory | "all";
}

type Row = Record<string, unknown>;

function one<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}

export async function fetchMarketplaceSuppliers(): Promise<MarketplaceSupplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, city, country")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as MarketplaceSupplier[];
}

export async function fetchMarketplaceListings(
  filters: MarketplaceFilters = {},
): Promise<MarketplaceListing[]> {
  let q = supabase
    .from("supplier_batches")
    .select(
      "id, supplier_id, product_id, batch_number, expiry_date, quantity, selling_price," +
        " products(id, name, generic_name, dosage_form, strength, UOM, category)," +
        " suppliers(id, name, city)",
    )
    .gt("quantity", 0)
    .order("selling_price", { ascending: true })
    .limit(300);

  if (filters.supplierId && filters.supplierId !== "all") {
    q = q.eq("supplier_id", filters.supplierId);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const term = (filters.search ?? "").trim().toLowerCase();

  return ((data ?? []) as unknown as Row[])
    .map<MarketplaceListing>((r) => {
      const p = one<Row>(r["products"]) ?? {};
      const s = one<Row>(r["suppliers"]) ?? {};
      return {
        id: r["id"] as string,
        supplier_id: (r["supplier_id"] as string) ?? "",
        supplier_name: (s["name"] as string) ?? "Unknown supplier",
        supplier_city: (s["city"] as string | null) ?? null,
        product_id: (r["product_id"] as string) ?? "",
        product_name: (p["name"] as string) ?? "Unnamed product",
        generic_name: (p["generic_name"] as string | null) ?? null,
        dosage_form: (p["dosage_form"] as string | null) ?? null,
        strength: (p["strength"] as string | null) ?? null,
        uom: ((p["UOM"] ?? p["uom"]) as string | null) ?? null,
        category: (p["category"] as ProductCategory | null) ?? null,
        batch_number: (r["batch_number"] as string | null) ?? null,
        expiry_date: (r["expiry_date"] as string | null) ?? null,
        quantity: Number(r["quantity"] ?? 0),
        selling_price: Number(r["selling_price"] ?? 0),
      };
    })
    .filter((l) => {
      if (filters.category && filters.category !== "all" && l.category !== filters.category) {
        return false;
      }
      if (!term) return true;
      return [l.product_name, l.generic_name, l.dosage_form, l.strength, l.supplier_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });
}

// ---------------- Order submission ----------------

export interface MarketplaceCartLine {
  listing: MarketplaceListing;
  quantity: number;
}

export interface SubmitOrderInput {
  pharmacy_id: string;
  lines: MarketplaceCartLine[];
  delivery_date?: string | null;
  notes?: string | null;
}

export interface SubmitOrderResult {
  orderIds: string[];
  total: number;
}

export function cartTotal(lines: MarketplaceCartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.listing.selling_price, 0);
}

/**
 * One purchase order per supplier (a pharmacy cart may mix suppliers).
 * Header first, then its line items; a failed item insert rolls the header
 * back so no orphaned order is left behind.
 */
export async function submitMarketplaceOrder(
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> {
  if (!input.pharmacy_id) throw new Error("No pharmacy in session.");
  const usable = input.lines.filter((l) => l.quantity > 0);
  if (usable.length === 0) throw new Error("Your order is empty.");

  const bySupplier = new Map<string, MarketplaceCartLine[]>();
  for (const line of usable) {
    const key = line.listing.supplier_id;
    bySupplier.set(key, [...(bySupplier.get(key) ?? []), line]);
  }

  const orderIds: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [supplierId, lines] of bySupplier) {
    const total = cartTotal(lines);

    const { data, error } = await supabase
      .from("pharmacies_purchase_orders")
      .insert({
        pharmacy_id: input.pharmacy_id,
        supplier_id: supplierId || null,
        order_date: today,
        expected_delivery_date: input.delivery_date || null,
        total_cost: total,
        left_balance: total,
        status: "Pending",
        notes: input.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const orderId = (data as { id: string }).id;

    const { error: itemErr } = await supabase.from("pharmacy_purchase_order_items").insert(
      lines.map((l) => ({
        purchase_order_id: orderId,
        product_id: l.listing.product_id,
        supplier_batch_id: l.listing.id,
        quantity_ordered: l.quantity,
        unit_cost: l.listing.selling_price,
        total_price: l.quantity * l.listing.selling_price,
        batch_number: l.listing.batch_number,
        expiry_date: l.listing.expiry_date,
      })),
    );
    if (itemErr) {
      await supabase.from("pharmacies_purchase_orders").delete().eq("id", orderId);
      throw new Error(itemErr.message);
    }

    orderIds.push(orderId);
  }

  return { orderIds, total: cartTotal(usable) };
}