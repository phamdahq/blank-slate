import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/db/supabase";

/**
 * Module-scope auth store. First mount kicks off `getSession()` and
 * subscribes to auth changes ONCE for the whole app; every subsequent
 * `useAuth()` reads the cached snapshot synchronously so navigation
 * doesn't flash a "Checking permissions…" state.
 */
type AuthSnapshot = { session: Session | null; loading: boolean };

let snapshot: AuthSnapshot = { session: null, loading: true };
const listeners = new Set<(s: AuthSnapshot) => void>();
let bootstrapped = false;

function setSnapshot(next: AuthSnapshot) {
  snapshot = next;
  persist(next.session);
  listeners.forEach((l) => l(snapshot));
}

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  supabase.auth.getSession().then(({ data }) => {
    setSnapshot({ session: data.session, loading: false });
  });
  supabase.auth.onAuthStateChange((_e, s) => {
    setSnapshot({ session: s, loading: false });
  });
}

export function useAuth(): { session: Session | null; user: User | null; loading: boolean } {
  bootstrap();
  const [local, setLocal] = useState<AuthSnapshot>(snapshot);
  useEffect(() => {
    // Sync in case snapshot changed between render and effect.
    setLocal(snapshot);
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return { session: local.session, user: local.session?.user ?? null, loading: local.loading };
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
