/**
 * Platform-owner: global products catalog CRUD (products + medicine_packs).
 */
import { supabase } from "@/lib/supabase";

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
  if (error) throw error;
  return (data ?? []) as GlobalProduct[];
}

export async function createGlobalProduct(
  input: Omit<GlobalProduct, "id" | "created_at">,
): Promise<GlobalProduct> {
  const { data, error } = await supabase.from("products").insert(input).select("*").single();
  if (error) throw error;
  return data as GlobalProduct;
}

export async function updateGlobalProduct(
  id: string,
  patch: Partial<Omit<GlobalProduct, "id" | "created_at">>,
): Promise<GlobalProduct> {
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as GlobalProduct;
}

export async function deleteGlobalProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
