/**
 * Platform-owner: global products catalog CRUD (products + medicine_packs).
 */
import { supabase } from "@/lib/supabase";

/**
 * Postgres folds unquoted identifiers to lowercase, so the physical column is
 * `uom`. PostgREST rejects writes that send `UOM`, which is why creating a
 * product used to fail. Map on the way in and out.
 */
type ProductRow = Omit<GlobalProduct, "UOM"> & { uom: string };

function fromRow<T extends { uom?: string; UOM?: string }>(row: T) {
  const { uom, ...rest } = row as T & { uom?: string };
  return { ...(rest as object), UOM: uom ?? (row as { UOM?: string }).UOM ?? "unit" };
}

function toRow(input: Partial<GlobalProduct>) {
  const { UOM, ...rest } = input;
  return UOM === undefined ? rest : { ...rest, uom: UOM };
}

/** Supabase errors are plain objects; surface their message. */
function fail(error: { message?: string; hint?: string | null }): never {
  throw new Error(error.message ?? "Database request failed.");
}

export interface GlobalProduct {
  id: string;
  name: string;
  generic_name: string | null;
  dosage_form: string | null;
  strength: string | null;
  UOM: string;
  release_type: string | null;
  category: "pharmaceutical" | "cosmetic" | "medical_device" | "supplies" | null;
  created_at: string;
}

export async function listGlobalProducts(): Promise<GlobalProduct[]> {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) fail(error);
  return ((data ?? []) as ProductRow[]).map(fromRow) as GlobalProduct[];
}

export interface GlobalProductWithPacks extends GlobalProduct {
  pack_sizes: number[];
}

/** Catalog rows joined with their registered pack sizes. */
export async function listGlobalCatalog(): Promise<GlobalProductWithPacks[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, medicine_packs(pack_size)")
    .order("name");
  if (error) fail(error);
  return ((data ?? []) as Array<ProductRow & { medicine_packs?: { pack_size: number }[] }>).map(
    ({ medicine_packs, ...p }) =>
      ({
        ...(fromRow(p) as GlobalProduct),
        pack_sizes: (medicine_packs ?? []).map((m) => m.pack_size).sort((a, b) => a - b),
      }) as GlobalProductWithPacks,
  );
}

/** Create a catalog item and optionally register its pack size. */
export async function createGlobalProductWithPack(
  input: Omit<GlobalProduct, "id" | "created_at">,
  packSize?: number | null,
): Promise<GlobalProduct> {
  const product = await createGlobalProduct(input);
  if (packSize && packSize > 0) {
    const { error } = await supabase
      .from("medicine_packs")
      .insert({ product_id: product.id, pack_size: packSize });
    if (error) fail(error);
  }
  return product;
}

export async function createGlobalProduct(
  input: Omit<GlobalProduct, "id" | "created_at">,
): Promise<GlobalProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert(toRow(input))
    .select("*")
    .single();
  if (error) fail(error);
  return fromRow(data as ProductRow) as GlobalProduct;
}

export async function updateGlobalProduct(
  id: string,
  patch: Partial<Omit<GlobalProduct, "id" | "created_at">>,
): Promise<GlobalProduct> {
  const { data, error } = await supabase
    .from("products")
    .update(toRow(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (error) fail(error);
  return fromRow(data as ProductRow) as GlobalProduct;
}

export async function deleteGlobalProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) fail(error);
}
