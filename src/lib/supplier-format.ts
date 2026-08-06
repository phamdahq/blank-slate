/** Shared formatting helpers for the Supplier Portal. */

export type OrderStatus = "Pending" | "Approved" | "Received" | "Cancelled";
export type PaymentStatus = "Paid" | "Credit" | "Partial";

/** Quantity at (or below) which a supplier batch counts as "low stock". */
export const LOW_STOCK_THRESHOLD = 150;

export function birr(n: number): string {
  return `ETB ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function paymentStatus(total: number, left: number): PaymentStatus {
  if (left <= 0) return "Paid";
  if (left >= total) return "Credit";
  return "Partial";
}
