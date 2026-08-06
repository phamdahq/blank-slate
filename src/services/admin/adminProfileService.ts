/**
 * Platform administrator own-account service (`platform_admins`).
 */
import { supabase } from "@/lib/supabase";
import { clearLocalSession } from "@/db/pharmacy-config";

export interface PlatformAdminRow {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  role: "platform_owner" | "support_admin" | "finance_admin";
  is_active: boolean;
  created_at: string;
}

export async function getPlatformAdmin(userId: string): Promise<PlatformAdminRow | null> {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PlatformAdminRow | null) ?? null;
}

export async function updatePlatformAdmin(
  userId: string,
  patch: Partial<Pick<PlatformAdminRow, "first_name" | "last_name" | "phone_number">>,
): Promise<PlatformAdminRow> {
  const { data, error } = await supabase
    .from("platform_admins")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PlatformAdminRow;
}

/** Platform-wide counters shown on the admin profile overview. */
export async function getPlatformSnapshot(): Promise<{
  pharmacies: number;
  activePharmacies: number;
  overduePharmacies: number;
  admins: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const [all, active, overdue, admins] = await Promise.all([
    supabase.from("pharmacies").select("id", { count: "exact", head: true }),
    supabase
      .from("pharmacies")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active"),
    supabase
      .from("pharmacies")
      .select("id", { count: "exact", head: true })
      .lte("next_payment_due", today),
    supabase.from("platform_admins").select("id", { count: "exact", head: true }),
  ]);
  return {
    pharmacies: all.count ?? 0,
    activePharmacies: active.count ?? 0,
    overduePharmacies: overdue.count ?? 0,
    admins: admins.count ?? 0,
  };
}

export async function changeOwnPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function adminSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    await clearLocalSession();
  }
}
