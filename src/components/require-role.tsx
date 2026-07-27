import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import type { Role } from "@/db/session";

/**
 * RBAC guard. Renders children only when the signed-in user's pharmacy role
 * is in `roles`. Unauthenticated users are sent to /login; authorised-but-
 * wrong-role users get an explicit restriction screen (no silent redirect).
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user, role, loading } = useSession();

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4">
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  if (!role || !roles.includes(role)) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-elev-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold">Restricted area</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This section is limited to{" "}
            <span className="font-semibold text-foreground">{roles.join(" / ")}</span>{" "}
            accounts. You are signed in as{" "}
            <span className="font-semibold text-foreground">{role ?? "unknown"}</span>.
          </p>
          <Link
            to="/pos"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Lock className="h-4 w-4" />
            Go to POS
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Convenience predicate for conditional UI (nav items, buttons). */
export function useHasRole(roles: Role[]): boolean {
  const { role } = useSession();
  return !!role && roles.includes(role);
}
