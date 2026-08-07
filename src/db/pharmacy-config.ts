/**
 * Offline-first pharmacy configuration:
 *   - `pharmacy_settings` (expiry warning window + deadstock threshold)
 *   - `payment_accounts`  (Telebirr / CBE destinations shown at POS checkout)
 *   - the signed-in user's own `users` profile row
 *
 * Every read hits Supabase when online and mirrors into Dexie; when offline
 * the Dexie mirror is returned. Every write lands in Dexie first and is
 * queued in the outbox for background sync.
 */
import {
  db,
  isBrowser,
  type PaymentAccount,
  type PharmacySettings,
  type UserRow,
} from "./dexie";
import { supabase } from "./supabase";
import { enqueue } from "./sync";

export const DEFAULT_SETTINGS = { expire_level: 90, deadstock: 90 };

// ---------------- Inventory rules ----------------

export const settingsRepo = {
  /** Local mirror (used by useLiveQuery). */
  local(pharmacyId: string) {
    return db.pharmacy_settings.get(pharmacyId);
  },

  /** Fetch from Supabase when online and refresh the Dexie mirror. */
  async refresh(pharmacyId: string): Promise<PharmacySettings | undefined> {
    if (!isBrowser) return undefined;
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from("pharmacy_settings")
        .select("*")
        .eq("pharmacy_id", pharmacyId)
        .maybeSingle();
      if (!error && data) {
        await db.pharmacy_settings.put(data as PharmacySettings);
        return data as PharmacySettings;
      }
    }
    return db.pharmacy_settings.get(pharmacyId);
  },

  /** Persist locally + queue upstream sync. */
  async save(row: PharmacySettings): Promise<void> {
    await db.pharmacy_settings.put(row);
    await enqueue({ kind: "pharmacy_settings.upsert", row });
  },
};

// ---------------- Payment accounts ----------------

export const paymentAccountsRepo = {
  local(pharmacyId: string) {
    return db.payment_accounts.where("pharmacy_id").equals(pharmacyId).toArray();
  },

  /**
   * Payment accounts are a local-only concept today — there is no remote
   * `payment_accounts` table in the schema, so this simply reads Dexie.
   */
  async refresh(pharmacyId: string): Promise<PaymentAccount[]> {
    if (!isBrowser) return [];
    return db.payment_accounts.where("pharmacy_id").equals(pharmacyId).toArray();
  },
};

// ---------------- Own profile ----------------

export const profileRepo = {
  async update(id: string, patch: Partial<UserRow>): Promise<void> {
    const current = await db.users.get(id);
    if (current) await db.users.put({ ...current, ...patch });
    await enqueue({ kind: "users.update", id, patch });
  },
};

/** Wipe tenant-scoped local state on sign-out (keeps the global catalog). */
export async function clearLocalSession(): Promise<void> {
  if (!isBrowser) return;
  await db.meta.bulkDelete(["active_pharmacy_id", "current_user_id"]);
  localStorage.removeItem("phamda.uid");
}
