/**
 * Pharmacy + tenant settings service.
 */
import { supabase } from "@/lib/supabase";
import { settingsRepo, paymentAccountsRepo } from "@/db/pharmacy-config";
import type { PharmacySettings } from "@/db/dexie";

export const getSettingsLocal = settingsRepo.local.bind(settingsRepo);
export const refreshSettings = settingsRepo.refresh.bind(settingsRepo);
export const saveSettings = (row: PharmacySettings) => settingsRepo.save(row);

export const getPaymentAccountsLocal = paymentAccountsRepo.local.bind(paymentAccountsRepo);
export const refreshPaymentAccounts = paymentAccountsRepo.refresh.bind(paymentAccountsRepo);

export async function getPharmacy(pharmacyId: string) {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
