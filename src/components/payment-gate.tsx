import { useEffect } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { CreditCard, Lock } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useBilling } from "@/hooks/use-billing";
import { refreshBilling } from "@/lib/billing";

/** Routes that must stay reachable even when the subscription lapsed. */
const ALLOWED_PREFIXES = [
  "/",
  "/features",
  "/pricing",
  "/contact",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/profile",
  "/admin",
];

function isAllowed(pathname: string) {
  if (pathname === "/") return true;
  return ALLOWED_PREFIXES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

/**
 * Blocks the whole workspace once `next_payment_due` has arrived. The state
 * comes from localStorage (instant, offline-safe) and is revalidated against
 * Supabase whenever a pharmacy session is available.
 */
export function PaymentGate() {
  const { pharmacyId } = useSession();
  const { locked, nextPaymentDue } = useBilling();
  const { location } = useRouterState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pharmacyId) return;
    void refreshBilling(pharmacyId);
    const onOnline = () => void refreshBilling(pharmacyId);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [pharmacyId]);

  if (!pharmacyId || !locked || isAllowed(location.pathname)) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/95 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-elev-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">Payment Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please pay to continue accessing your account.
        </p>
        {nextPaymentDue && (
          <p className="mt-1 font-mono-data text-[11px] uppercase tracking-wider text-subtle-foreground">
            Due {nextPaymentDue}
          </p>
        )}
        <button
          type="button"
          onClick={() => void navigate({ to: "/profile" })}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <CreditCard className="h-4 w-4" /> Pay now
        </button>
      </div>
    </div>
  );
}
