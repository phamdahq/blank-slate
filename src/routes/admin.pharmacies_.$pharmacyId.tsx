import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Ban,
  ChevronRight,
  CreditCard,
  ExternalLink,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCard } from "@/components/admin/admin-primitives";
import { cn } from "@/lib/utils";
import {
  getPharmacyDetail,
  setSubscriptionStatus,
  type PharmacyDetail,
} from "@/services/admin/pharmacyDirectoryService";

export const Route = createFileRoute("/admin/pharmacies_/$pharmacyId")({
  head: () => ({
    meta: [
      { title: "Pharmacy Command Center · Phamda Admin" },
      { name: "description", content: "Ownership, location and billing details for a pharmacy tenant." },
      { property: "og:title", content: "Pharmacy Command Center · Phamda Admin" },
      {
        property: "og:description",
        content: "Ownership, location and billing details for a pharmacy tenant.",
      },
    ],
  }),
  component: PharmacyDetailPage,
});

function PharmacyDetailPage() {
  const { pharmacyId } = Route.useParams();
  const [row, setRow] = useState<PharmacyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPharmacyDetail(pharmacyId)
      .then((r) => !cancelled && setRow(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [pharmacyId]);

  async function toggleSuspend() {
    if (!row) return;
    const next = row.subscription_status === "suspended" ? "active" : "suspended";
    setBusy(true);
    try {
      await setSubscriptionStatus(row.id, next);
      setRow({ ...row, subscription_status: next });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <nav className="flex items-center gap-1.5 font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Link to="/admin/pharmacies" className="text-primary hover:underline">
          Pharmacies
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Pharmacy Command Center</span>
      </nav>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!row && !error && <p className="mt-6 text-sm text-muted-foreground">Loading pharmacy…</p>}

      {row && (
        <>
          <header className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {row.name}
                </h1>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 font-mono-data text-[10px] font-bold uppercase tracking-wide",
                    row.subscription_status === "active"
                      ? "bg-primary text-primary-foreground"
                      : row.subscription_status === "expired"
                        ? "bg-danger text-primary-foreground"
                        : "bg-warning text-primary-foreground",
                  )}
                >
                  {row.subscription_status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Managing pharmaceutical operations and logistics for {row.city} hub.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/pharmacies"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-low"
              >
                <Pencil className="h-4 w-4" /> Edit Details
              </Link>
              <button
                onClick={toggleSuspend}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-danger bg-surface px-4 text-sm font-semibold text-danger hover:bg-surface-low disabled:opacity-60"
              >
                <Ban className="h-4 w-4" />
                {row.subscription_status === "suspended" ? "Reactivate Account" : "Suspend Account"}
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {/* Ownership */}
            <AdminCard className="p-5">
              <CardHead title="Ownership" icon={<IdCard className="h-5 w-5 text-primary" />} />
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-surface-low p-3">
                  <p className="text-sm font-bold text-foreground">
                    {row.owner ? `${row.owner.first_name} ${row.owner.last_name}` : "No owner linked"}
                  </p>
                  <p className="text-xs text-muted-foreground">Primary Owner &amp; Pharmacist</p>
                </div>
                <Field
                  icon={<Phone className="h-4 w-4 text-primary" />}
                  label="Mobile Phone"
                  value={row.owner?.phone_number ?? "—"}
                />
                <Field
                  icon={<Mail className="h-4 w-4 text-primary" />}
                  label="Email Address"
                  value={row.owner?.email ?? "—"}
                />
              </div>
            </AdminCard>

            {/* Location */}
            <AdminCard className="p-5">
              <CardHead
                title="Location & Logistics"
                icon={<MapPin className="h-5 w-5 text-primary" />}
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Country" value={row.country || "—"} />
                <Stat label="City" value={row.city || "—"} />
              </div>
              <div className="mt-3 rounded-lg bg-primary-soft p-3">
                <p className="font-mono-data text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  GPS Coordinates
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Stat label="Lat" value={row.latitude != null ? `${row.latitude}°` : "—"} mono />
                  <Stat label="Lon" value={row.longitude != null ? `${row.longitude}°` : "—"} mono />
                </div>
                {row.latitude != null && row.longitude != null && (
                  <a
                    href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    View on Map <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </AdminCard>

            {/* Billing */}
            <AdminCard className="p-5">
              <CardHead title="Billing" icon={<CreditCard className="h-5 w-5 text-primary" />} />
              <div className="mt-4 rounded-lg bg-primary p-4 text-primary-foreground">
                <p className="font-mono-data text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Active Plan
                </p>
                <p className="text-xl font-extrabold uppercase tracking-wide">{row.tier}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="Cycle" value="Monthly" />
                <Stat
                  label="Renewal"
                  value={row.next_payment_due ? formatDate(row.next_payment_due) : "—"}
                />
              </div>
              <p className="mt-4 font-mono-data text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Payment History
              </p>
              <table className="mt-2 w-full table-fixed">
                <thead>
                  <tr className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-[40%] py-2 text-left">Date</th>
                    <th className="w-[32%] py-2 text-left">Amount</th>
                    <th className="w-[28%] py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {row.payouts.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2 text-xs text-foreground">{formatDate(p.paid_at)}</td>
                      <td className="py-2 font-mono-data text-xs font-bold text-foreground">
                        {Number(p.amount).toFixed(2)} ETB
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 font-mono-data text-[10px] font-bold uppercase",
                            p.status === "verified"
                              ? "bg-primary text-primary-foreground"
                              : p.status === "rejected"
                                ? "bg-danger text-primary-foreground"
                                : "bg-warning-soft text-warning",
                          )}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {row.payouts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-xs text-muted-foreground">
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </AdminCard>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function CardHead({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 truncate text-lg font-extrabold text-primary">
        {icon}
        {title}
      </h2>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-low p-3">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono-data text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-low p-3">
      <p className="font-mono-data text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("truncate text-sm font-bold text-foreground", mono && "font-mono-data")}>
        {value}
      </p>
    </div>
  );
}

function formatDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
