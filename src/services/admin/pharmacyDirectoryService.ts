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
