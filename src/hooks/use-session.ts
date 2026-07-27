import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "./use-auth";
import { loadProfile, type Role } from "@/db/session";
import type { UserRow } from "@/db/dexie";

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
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProfile(null);
      setLoadingProfile(authLoading);
      return;
    }
    setLoadingProfile(true);
    void loadProfile(user.id).then((p) => {
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
