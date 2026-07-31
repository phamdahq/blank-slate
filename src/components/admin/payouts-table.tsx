import { Banknote, Check, Landmark, Smartphone, X } from "lucide-react";
import type { AdminPayoutRow, PayoutMethod, PayoutStatus } from "@/services/admin/payoutService";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "Pending",
  verified: "Approved",
  rejected: "Rejected",
};

const STATUS_TONE: Record<PayoutStatus, string> = {
  pending: "bg-primary-soft text-primary-soft-foreground",
  verified: "bg-success-soft text-success-soft-foreground",
  rejected: "bg-danger-soft text-danger-soft-foreground",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_TONE[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PayoutMethodCell({ method }: { method: PayoutMethod }) {
  const Icon = method === "CBE" ? Landmark : method === "Telebirr" ? Smartphone : Banknote;
  const tone =
    method === "CBE" ? "text-primary" : method === "Telebirr" ? "text-success" : "text-foreground";
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-bold", tone)}>
      <Icon className="h-4 w-4" />
      {method === "Cash" ? "CASH" : method}
    </span>
  );
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const hours = (Date.now() - then) / 3_600_000;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface PayoutsTableProps {
  rows: AdminPayoutRow[];
  busyId?: string | null;
  onApprove: (row: AdminPayoutRow) => void;
  onReject: (row: AdminPayoutRow) => void;
  onReevaluate: (row: AdminPayoutRow) => void;
}

export function PayoutsTable({
  rows,
  busyId,
  onApprove,
  onReject,
  onReevaluate,
}: PayoutsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-low text-left font-mono-data text-xs uppercase tracking-wider text-foreground">
            <th className="px-5 py-4 font-bold">Pharmacy name</th>
            <th className="px-5 py-4 text-right font-bold">Amount (ETB)</th>
            <th className="px-5 py-4 font-bold">Method</th>
            <th className="px-5 py-4 font-bold">Transaction ID</th>
            <th className="px-5 py-4 font-bold">Submitted</th>
            <th className="px-5 py-4 font-bold">Status</th>
            <th className="px-5 py-4 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                No payouts to show.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border align-middle">
              <td className="px-5 py-4 font-bold text-primary">{row.pharmacy_name}</td>
              <td className="px-5 py-4 text-right font-mono-data font-semibold text-foreground">
                {Number(row.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-5 py-4">
                <PayoutMethodCell method={row.payment_method} />
              </td>
              <td className="px-5 py-4 font-mono-data text-muted-foreground">
                {row.transaction_reference}
              </td>
              <td className="px-5 py-4 text-foreground">{relativeTime(row.paid_at)}</td>
              <td className="px-5 py-4">
                <PayoutStatusBadge status={row.status} />
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-3">
                  {row.status === "pending" && (
                    <>
                      <button
                        disabled={busyId === row.id}
                        onClick={() => onApprove(row)}
                        aria-label="Approve payout"
                        className="text-primary disabled:opacity-50"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        disabled={busyId === row.id}
                        onClick={() => onReject(row)}
                        aria-label="Reject payout"
                        className="text-danger disabled:opacity-50"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {row.status === "verified" && (
                    <span className="font-mono-data text-sm italic text-muted-foreground">
                      Processed
                    </span>
                  )}
                  {row.status === "rejected" && (
                    <button
                      disabled={busyId === row.id}
                      onClick={() => onReevaluate(row)}
                      className="text-sm font-bold text-primary disabled:opacity-50"
                    >
                      Re-evaluate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
