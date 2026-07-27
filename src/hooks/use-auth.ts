import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/db/supabase";

/**
 * Reactive Supabase auth session. Also mirrors the current user id to
 * localStorage under `phamda.uid` so non-React modules (sync engine, repos)
 * can read it without a hook.
 */
export function useAuth(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      persist(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      persist(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

function persist(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s?.user?.id) localStorage.setItem("phamda.uid", s.user.id);
  else localStorage.removeItem("phamda.uid");
}

export function currentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("phamda.uid");
}
