/**
 * platform_payouts: subscription payments made by pharmacies to the
 * platform. Pharmacy owners insert their own rows; platform admins read
 * everything.
 */
import { supabase } from "@/lib/supabase";

export type PayoutStatus = "pending" | "verified" | "rejected";
export type PayoutMethod = "Cash" | "CBE" | "Telebirr";

export interface PlatformPayout {
  id: string;
  pharmacy_id: string;
  platform_config_id: string | null;
  amount: number;
  payment_method: PayoutMethod;
  transaction_reference: string;
  status: PayoutStatus;
  paid_at: string;
}

/** Payout enriched with the pharmacy name, for the admin console table. */
export interface AdminPayoutRow extends PlatformPayout {
  pharmacy_name: string;
}

export async function listPayouts(pharmacyId?: string): Promise<PlatformPayout[]> {
  let q = supabase.from("platform_pharmacies_payouts").select("*").order("paid_at", { ascending: false });
  if (pharmacyId) q = q.eq("pharmacy_id", pharmacyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlatformPayout[];
}

/** All payouts across every tenant, joined with pharmacy names. */
export async function listAllPayoutsForAdmin(): Promise<AdminPayoutRow[]> {
  const { data, error } = await supabase
    .from("platform_pharmacies_payouts")
    .select("*, pharmacies(name)")
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<PlatformPayout & { pharmacies?: { name?: string } | null }>).map(
    (r) => ({
      ...r,
      pharmacy_name: r.pharmacies?.name ?? "Unknown pharmacy",
    }),
  );
}

export async function submitPayout(
  input: Omit<PlatformPayout, "id" | "status" | "paid_at"> & { id?: string },
): Promise<PlatformPayout> {
  const { data, error } = await supabase
    .from("platform_pharmacies_payouts")
    .insert({ ...input, status: "pending" })
    .select("*")
    .single();
  if (error) throw error;
  return data as PlatformPayout;
}

export async function setPayoutStatus(id: string, status: PayoutStatus): Promise<void> {
  const { data, error } = await supabase
    .from("platform_pharmacies_payouts")
    .update({ status })
    .eq("id", id)
    .select("id, pharmacy_id")
    .single();
  if (error) throw new Error(error.message);

  // Approving a payout activates the pharmacy's subscription and moves the
  // next due date one month forward.
  if (status === "verified" && data?.pharmacy_id) {
    await activateSubscription(data.pharmacy_id as string);
  }
}

function nextMonthISO(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  // Clamp overflow (e.g. Jan 31 -> Mar 3) back to the last day of the month.
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/** Mark the pharmacy active and push `next_payment_due` to next month. */
export async function activateSubscription(pharmacyId: string): Promise<void> {
  const { data } = await supabase
    .from("pharmacies")
    .select("next_payment_due")
    .eq("id", pharmacyId)
    .maybeSingle();

  const currentDue = (data as { next_payment_due?: string | null } | null)?.next_payment_due;
  const base =
    currentDue && new Date(currentDue) > new Date() ? new Date(currentDue) : new Date();

  const { error } = await supabase
    .from("pharmacies")
    .update({ subscription_status: "active", next_payment_due: nextMonthISO(base) })
    .eq("id", pharmacyId);
  if (error) throw new Error(error.message);
}

export const approvePayout = (id: string) => setPayoutStatus(id, "verified");
export const rejectPayout = (id: string) => setPayoutStatus(id, "rejected");
