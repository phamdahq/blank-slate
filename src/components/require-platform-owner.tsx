import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert, WifiOff } from "lucide-react";
import { supabase } from "@/db/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useOnline } from "@/hooks/use-online";

type State = "checking" | "allowed" | "denied" | "anonymous";

// Cache platform-owner check per user so navigation between admin pages
// doesn't re-hit Supabase and flash "Checking permissions…".
const ownerCache = new Map<string, boolean>();
const ownerInFlight = new Map<string, Promise<boolean>>();

/**
 * Paths that must not reveal their existence to anyone but a platform owner.
 * Unauthorized/unauthenticated visitors get a plain 404 instead of a
 * "restricted area" notice.
 */
const CLOAKED_PATHS = ["/admin/register"];

/**
 * Guard for global platform management screens (e.g. /register).
 * Only users present in `platform_admins` with role `platform_owner` pass.
 */
export function RequirePlatformOwner({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const online = useOnline();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cloaked = CLOAKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const initial: State = user
    ? ownerCache.has(user.id)
      ? ownerCache.get(user.id)
        ? "allowed"
        : "denied"
      : "checking"
    : "checking";
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!online) return;
    if (!user) {
      setState("anonymous");
      if (!cloaked && typeof window !== "undefined") window.location.replace("/login");
      return;
    }
    if (ownerCache.has(user.id)) {
      setState(ownerCache.get(user.id) ? "allowed" : "denied");
    } else {
      setState("checking");
    }
    let promise = ownerInFlight.get(user.id);
    if (!promise) {
      promise = Promise.resolve(
        supabase
          .from("platform_admins")
          .select("id, role, is_active")
          .eq("id", user.id)
          .maybeSingle(),
      ).then(({ data }) => {
        const ok = !!data && data.role === "platform_owner" && data.is_active !== false;
        ownerCache.set(user.id, ok);
        ownerInFlight.delete(user.id);
        return ok;
      });
      ownerInFlight.set(user.id, promise);
    }
    void promise.then((ok) => {
      if (cancelled) return;
      setState(ok ? "allowed" : "denied");
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading, online, cloaked]);

  if (cloaked && (state === "denied" || state === "anonymous")) {
    return <NotFound />;
  }

  // The master console is a strictly online surface — nothing here is served
  // from the offline Dexie mirror.
  if (!online) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-elev-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-warning-soft text-warning">
            <WifiOff className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold">You're offline</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The Phamda master console requires an internet connection. Reconnect to continue
            managing pharmacies, products, and payouts.
          </p>
        </div>
      </div>
    );
  }

  if (loading || state === "checking") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (state === "anonymous") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-elev-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold">Restricted area</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pharmacy registration is limited to Phamda platform owners. If you need a new
            pharmacy workspace, contact our team and we'll set it up for you.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Contact Phamda
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-sm text-center">
        <p className="font-mono-data text-sm font-bold uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-lg font-bold">Page not found</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
