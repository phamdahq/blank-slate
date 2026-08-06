/**
 * Subscription enforcement.
 *
 * The tenant's `next_payment_due` / `subscription_status` are mirrored into
 * localStorage so this offline-first PWA can decide instantly — without a
 * network round trip — whether the workspace should be locked behind the
 * payment wall. Supabase stays the source of truth and refreshes the mirror
 * whenever the app is online.
 */
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "phamda.billing";

export interface BillingSnapshot {
  pharmacyId: string | null;
  nextPaymentDue: string | null;
  subscriptionStatus: string | null;
}

const EMPTY: BillingSnapshot = {
  pharmacyId: null,
  nextPaymentDue: null,
  subscriptionStatus: null,
};

const isBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();

function readStorage(): BillingSnapshot {
  if (!isBrowser) return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BillingSnapshot>;
    return {
      pharmacyId: parsed.pharmacyId ?? null,
      nextPaymentDue: parsed.nextPaymentDue ?? null,
      subscriptionStatus: parsed.subscriptionStatus ?? null,
    };
  } catch {
    return EMPTY;
  }
}

let snapshot: BillingSnapshot = readStorage();

function emit() {
  for (const l of listeners) l();
}

/** Persist the snapshot locally and notify subscribers. */
export function setBillingSnapshot(next: BillingSnapshot) {
  snapshot = next;
  if (isBrowser) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage disabled — in-memory state still works for this session */
    }
  }
  emit();
}

export function clearBillingSnapshot() {
  snapshot = EMPTY;
  if (isBrowser) window.localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function getBillingSnapshot(): BillingSnapshot {
  return snapshot;
}

/** SSR snapshot: never locked on the server, the client re-evaluates. */
export function getServerBillingSnapshot(): BillingSnapshot {
  return EMPTY;
}

export function subscribeBilling(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Midnight-normalised comparison. */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Locked when the due date has arrived/passed, or when the tenant was
 * explicitly suspended/expired by the platform.
 */
export function isPaymentOverdue(s: BillingSnapshot, now = new Date()): boolean {
  if (s.subscriptionStatus === "suspended" || s.subscriptionStatus === "expired") return true;
  if (!s.nextPaymentDue) return false;
  const due = new Date(s.nextPaymentDue);
  if (Number.isNaN(due.getTime())) return false;
  return startOfDay(now) >= startOfDay(due);
}

/** Pull the authoritative billing state from Supabase into localStorage. */
export async function refreshBilling(pharmacyId: string): Promise<BillingSnapshot> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("next_payment_due, subscription_status")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (error || !data) return snapshot;
  const row = data as { next_payment_due?: string | null; subscription_status?: string | null };
  const next: BillingSnapshot = {
    pharmacyId,
    nextPaymentDue: row.next_payment_due ?? null,
    subscriptionStatus: row.subscription_status ?? null,
  };
  setBillingSnapshot(next);
  return next;
}

function addOneMonth(from: Date): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/**
 * Called once a payment is accepted: rolls `next_payment_due` forward,
 * reactivates the subscription in Supabase, and unlocks the app locally.
 */
export async function recordPaymentSuccess(pharmacyId: string): Promise<BillingSnapshot> {
  const current = snapshot.nextPaymentDue ? new Date(snapshot.nextPaymentDue) : null;
  const base =
    current && !Number.isNaN(current.getTime()) && current > new Date() ? current : new Date();
  const nextDue = addOneMonth(base);

  const { error } = await supabase
    .from("pharmacies")
    .update({ subscription_status: "active", next_payment_due: nextDue })
    .eq("id", pharmacyId);
  if (error) throw new Error(error.message);

  const next: BillingSnapshot = {
    pharmacyId,
    nextPaymentDue: nextDue,
    subscriptionStatus: "active",
  };
  setBillingSnapshot(next);
  return next;
}
