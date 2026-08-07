/**
 * Platform-owner: pharmacies directory (list + filters).
 */
import { supabase } from "@/lib/supabase";

export type SubscriptionStatus = "trial" | "active" | "suspended" | "expired";
export type PharmacyTier = "basic" | "pro" | "enterprise";

export interface DirectoryPharmacy {
  id: string;
  name: string;
  city: string;
  country: string;
  tier: PharmacyTier;
  subscription_status: SubscriptionStatus;
  next_payment_due: string | null;
  created_at: string;
}

/** Every tenant on the platform, newest first. */
export async function listPharmacies(): Promise<DirectoryPharmacy[]> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("id, name, city, country, tier, subscription_status, next_payment_due, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DirectoryPharmacy[];
}

export interface DirectoryFilters {
  search?: string;
  status?: "all" | SubscriptionStatus;
  city?: string;
  tier?: "all" | PharmacyTier;
}

/** Pure client-side filtering so tabs/filters stay instant. */
export function filterPharmacies(
  rows: DirectoryPharmacy[],
  { search = "", status = "all", city = "all", tier = "all" }: DirectoryFilters & { city?: string },
): DirectoryPharmacy[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (status !== "all" && r.subscription_status !== status) return false;
    if (city !== "all" && r.city !== city) return false;
    if (tier !== "all" && r.tier !== tier) return false;
    return true;
  });
}

export function countByStatus(rows: DirectoryPharmacy[]) {
  return {
    all: rows.length,
    active: rows.filter((r) => r.subscription_status === "active").length,
    expired: rows.filter((r) => r.subscription_status === "expired").length,
    trial: rows.filter((r) => r.subscription_status === "trial").length,
  };
}

export function uniqueCities(rows: DirectoryPharmacy[]): string[] {
  return Array.from(new Set(rows.map((r) => r.city).filter(Boolean))).sort();
}

// ---------------- Detail view ----------------

export interface PharmacyOwner {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  role: string;
}

export interface PharmacyPayout {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  paid_at: string;
}

export interface PharmacyDetail extends DirectoryPharmacy {
  latitude: number | null;
  longitude: number | null;
  owner: PharmacyOwner | null;
  payouts: PharmacyPayout[];
}

/** Full command-center payload for a single tenant. */
export async function getPharmacyDetail(id: string): Promise<PharmacyDetail> {
  const [pharmacyRes, ownerRes, payoutRes] = await Promise.all([
    supabase
      .from("pharmacies")
      .select(
        "id, name, city, country, tier, subscription_status, next_payment_due, created_at, latitude, longitude",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pharmacy_users")
      .select("id, first_name, last_name, phone_number, email, role")
      .eq("pharmacy_id", id)
      .eq("role", "owner")
      .maybeSingle(),
    supabase
      .from("platform_pharmacies_payouts")
      .select("id, amount, payment_method, status, paid_at")
      .eq("pharmacy_id", id)
      .order("paid_at", { ascending: false })
      .limit(12),
  ]);

  if (pharmacyRes.error) throw new Error(pharmacyRes.error.message);
  if (!pharmacyRes.data) throw new Error("Pharmacy not found");

  return {
    ...(pharmacyRes.data as PharmacyDetail),
    owner: (ownerRes.data as PharmacyOwner | null) ?? null,
    payouts: (payoutRes.data ?? []) as PharmacyPayout[],
  };
}

/** Flip a tenant between active and suspended. */
export async function setSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
): Promise<void> {
  const { error } = await supabase
    .from("pharmacies")
    .update({ subscription_status: status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
