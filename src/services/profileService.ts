/**
 * Own-account (profile) service. Works for both `users` and
 * `platform_admins`-derived sessions via the shared `loadProfile`.
 */
import { profileRepo } from "@/db/pharmacy-config";
import { loadProfile, resolvePostLoginTarget, clearLocalSession } from "@/db/session";
import type { UserRow } from "@/db/dexie";
import { supabase } from "@/lib/supabase";

export function loadUserProfile(userId: string) {
  return loadProfile(userId);
}

export function resolveLoginTarget(userId: string) {
  return resolvePostLoginTarget(userId);
}

export function updateOwnProfile(userId: string, patch: Partial<UserRow>) {
  return profileRepo.update(userId, patch);
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    await clearLocalSession();
  }
}
