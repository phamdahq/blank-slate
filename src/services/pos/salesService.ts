/**
 * POS sales service. Thin wrapper over the offline-first `salesRepo`
 * so that UI code never touches Dexie / Supabase directly.
 *
 * `checkout` records the sale locally, decrements batch stock, and
 * enqueues the atomic `record_sale` RPC for background sync.
 */
import { salesRepo, type CheckoutLine, type CheckoutResult } from "@/db/repositories";

export type { CheckoutLine, CheckoutResult };

export function checkout(
  pharmacyId: string,
  lines: CheckoutLine[],
): Promise<CheckoutResult> {
  return salesRepo.checkout(pharmacyId, lines);
}

export function recentSales(limit = 50) {
  return salesRepo.recentSales(limit);
}
