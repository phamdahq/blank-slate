import { useSyncExternalStore } from "react";
import {
  getBillingSnapshot,
  getServerBillingSnapshot,
  isPaymentOverdue,
  subscribeBilling,
  type BillingSnapshot,
} from "@/lib/billing";

/** Reactive view of the locally mirrored subscription state. */
export function useBilling(): BillingSnapshot & { locked: boolean } {
  const snapshot = useSyncExternalStore(
    subscribeBilling,
    getBillingSnapshot,
    getServerBillingSnapshot,
  );
  return { ...snapshot, locked: isPaymentOverdue(snapshot) };
}
