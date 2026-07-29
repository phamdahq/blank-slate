import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "./use-auth";
import { loadProfile, type Role } from "@/db/session";
import type { UserRow } from "@/db/dexie";

// Module-scope profile cache keyed by user id, so navigating between
// routes doesn't re-trigger a loading state on every mount.
const profileCache = new Map<string, UserRow | null>();
const inFlight = new Map<string, Promise<UserRow | null>>();

export interface SessionState {
  user: User | null;
  profile: UserRow | null;
  role: Role | null;
  pharmacyId: string | null;
  loading: boolean;
}

/**
 * Auth session + the pharmacy `users` row that carries role and tenant.
 * Works offline via the Dexie mirror written by `loadProfile`.
 */
export function useSession(): SessionState {
  const { user, loading: authLoading } = useAuth();
  const cached = user ? profileCache.get(user.id) ?? null : null;
  const hasCached = user ? profileCache.has(user.id) : false;
  const [profile, setProfile] = useState<UserRow | null>(cached);
  const [loadingProfile, setLoadingProfile] = useState(!hasCached);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProfile(null);
      setLoadingProfile(authLoading);
      return;
    }
    // Serve cached value instantly; still revalidate in background.
    if (profileCache.has(user.id)) {
      setProfile(profileCache.get(user.id) ?? null);
      setLoadingProfile(false);
    } else {
      setLoadingProfile(true);
    }
    let promise = inFlight.get(user.id);
    if (!promise) {
      promise = loadProfile(user.id).then((p) => {
        profileCache.set(user.id, p);
        inFlight.delete(user.id);
        return p;
      });
      inFlight.set(user.id, promise);
    }
    void promise.then((p) => {
      if (cancelled) return;
      setProfile(p);
      setLoadingProfile(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    user,
    profile,
    role: (profile?.role as Role | undefined) ?? null,
    pharmacyId: profile?.pharmacy_id ?? null,
    loading: authLoading || loadingProfile,
  };
}
