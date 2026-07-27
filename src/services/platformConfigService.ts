/**
 * platform_config: platform-wide payment destination shown to pharmacies
 * when they settle their subscription (CBE + Telebirr + full name).
 */
import { supabase } from "@/lib/supabase";

export interface PlatformConfig {
  id: string;
  payment_full_name: string | null;
  support_phone_number: string;
  cbe_account_number: string | null;
  telebirr: string | null;
  created_at: string;
}

/** Fetch the active platform payment configuration (single-row table). */
export async function getPlatformConfig(): Promise<PlatformConfig | null> {
  const { data, error } = await supabase
    .from("platform_config")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PlatformConfig | null) ?? null;
}

/** Platform-owner: upsert the single platform_config row. */
export async function savePlatformConfig(
  patch: Partial<Omit<PlatformConfig, "id" | "created_at">> & { id?: string },
): Promise<PlatformConfig> {
  const { data, error } = await supabase
    .from("platform_config")
    .upsert(patch)
    .select("*")
    .single();
  if (error) throw error;
  return data as PlatformConfig;
}
