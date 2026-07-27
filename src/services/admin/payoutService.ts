/**
 * platform_payouts: subscription payments made by pharmacies to the
 * platform. Pharmacy owners insert their own rows; platform admins read
 * everything.
 */
import { supabase } from "@/lib/supabase";

export interface PlatformPayout {
  id: string;
  pharmacy_id: string;
  platform_config_id: string | null;
  amount: number;
  payment_method: "Cash" | "CBE" | "Telebirr";
  transaction_reference: string;
  status: "pending" | "verified" | "rejected";
  paid_at: string;
}

export async function listPayouts(pharmacyId?: string): Promise<PlatformPayout[]> {
  let q = supabase.from("platform_payouts").select("*").order("paid_at", { ascending: false });
  if (pharmacyId) q = q.eq("pharmacy_id", pharmacyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlatformPayout[];
}

export async function submitPayout(
  input: Omit<PlatformPayout, "id" | "status" | "paid_at"> & { id?: string },
): Promise<PlatformPayout> {
  const { data, error } = await supabase
    .from("platform_payouts")
    .insert({ ...input, status: "pending" })
    .select("*")
    .single();
  if (error) throw error;
  return data as PlatformPayout;
}

export async function setPayoutStatus(
  id: string,
  status: PlatformPayout["status"],
): Promise<void> {
  const { error } = await supabase.from("platform_payouts").update({ status }).eq("id", id);
  if (error) throw error;
}
