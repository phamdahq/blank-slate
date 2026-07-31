/**
 * Session + RBAC source of truth.
 *
 * The signed-in user's `users` row (role + pharmacy_id) is fetched from
 * Supabase when online and mirrored into Dexie so role checks keep working
 * offline. Never trust anything else for role gating on the client — the
 * server still enforces RLS.
 */
import { db, isBrowser, type UserRow } from "./dexie";
import { supabase } from "./supabase";

export type Role = "owner" | "pharmacist" | "cashier";

/** Roles allowed to manage inventory / add batches. */
export const INVENTORY_ROLES: Role[] = ["owner"];

export async function loadProfile(userId: string): Promise<UserRow | null> {
  if (!isBrowser) return null;

  const local = (await db.users.get(userId)) ?? null;

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      const row = data as UserRow;
      await db.users.put(row);
      await db.meta.put({ key: "active_pharmacy_id", value: row.pharmacy_id });
      await db.meta.put({ key: "current_user_id", value: row.id });
      return row;
    }
  }

  return local;
}

export async function cachedPharmacyId(): Promise<string | null> {
  if (!isBrowser) return null;
  const m = await db.meta.get("active_pharmacy_id");
  return (m?.value as string) ?? null;
}

// ---------- Post-login routing ----------

export type PostLoginTarget =
  | { kind: "ok"; to: "/admin" | "/dashboard" | "/pos"; role: string; pharmacyId: string | null }
  | { kind: "error"; message: string };

/**
 * Decides where a user lands right after sign-in.
 *
 * - platform admins go to the master console dashboard
 * - pharmacy `owner`s goes to his pharmacy with full acces
 * - any other associated user goes to their pharmacy workspace (POS)
 * - unknown users, or users with no tenant, get an explicit permission notice
 */
export async function resolvePostLoginTarget(userId: string): Promise<PostLoginTarget> {
  // 1. Platform admin group takes precedence over pharmacy roles.
  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (admin) {
    if (admin.is_active === false) {
      return { kind: "error", message: "This platform account has been deactivated." };
    }
    if (admin.role === "platform_owner") {
      return { kind: "ok", to: "/admin", role: "platform_owner", pharmacyId: null };
    }
    return { kind: "ok", to: "/dashboard", role: admin.role, pharmacyId: null };
  }

  if (adminError) {
    return {
      kind: "error",
      message:
        "We couldn't verify your platform access (database permissions). Please contact Phamda support.",
    };
  }

  // 2. Pharmacy user record (also mirrored into Dexie for offline role checks).
  const profile = await loadProfile(userId);


  if (!profile) {
    return {
      kind: "error",
      message:
        "We couldn't find an account record for you. Ask your pharmacy owner to invite you, or contact Phamda support.",
    };
  }

  if (profile.is_active === false) {
    return { kind: "error", message: "This account has been deactivated. Contact your pharmacy owner." };
  }

  if (profile.role === "owner") {
    return { kind: "ok", to: "/dashboard", role: profile.role, pharmacyId: profile.pharmacy_id ?? null };
  }

  if (!profile.pharmacy_id) {
    return {
      kind: "error",
      message: "Your account isn't linked to a pharmacy yet. Ask your owner to assign you to a branch.",
    };
  }

  return { kind: "ok", to: "/pos", role: profile.role, pharmacyId: profile.pharmacy_id };
}
