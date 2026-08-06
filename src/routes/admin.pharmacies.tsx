import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCard, AdminTabs } from "@/components/admin/admin-primitives";
import { cn } from "@/lib/utils";
import {
  countByStatus,
  filterPharmacies,
  listPharmacies,
  uniqueCities,
  type DirectoryPharmacy,
  type SubscriptionStatus,
} from "@/services/admin/pharmacyDirectoryService";

export const Route = createFileRoute("/admin/pharmacies")({
  head: () => ({
    meta: [
      { title: "Pharmacies Directory · Phamda Admin" },
      { name: "description", content: "Manage every pharmacy tenant on the Phamda platform." },
      { property: "og:title", content: "Pharmacies Directory · Phamda Admin" },
      {
        property: "og:description",
        content: "Manage clinical partnerships and subscription lifecycles on Phamda.",
      },
    ],
  }),
  component: PharmaciesPage,
});

type Tab = "all" | SubscriptionStatus;

const STATUS_DOT: Record<SubscriptionStatus, string> = {
  active: "bg-success",
  trial: "bg-warning",
  expired: "bg-danger",
  suspended: "bg-warning",
};

function PharmaciesPage() {
  const [rows, setRows] = useState<DirectoryPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [city, setCity] = useState("all");
  const [tier, setTier] = useState("all");

  useEffect(() => {
    let cancelled = false;
    listPharmacies()
      .then((r) => !cancelled && setRows(r))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => countByStatus(rows), [rows]);
  const cities = useMemo(() => uniqueCities(rows), [rows]);
  const visible = useMemo(
    () =>
      filterPharmacies(rows, {
        search,
        status: tab,
        city,
        tier: tier as "all",
      }),
    [rows, search, tab, city, tier],
  );

  return (
    <AdminShell searchPlaceholder="Search pharmacies by name" search={search} onSearchChange={setSearch}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Pharmacies Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage clinical partnerships and subscription lifecycles.
          </p>
        </div>
        <Link
          to="/admin/register"
          className="hidden h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover md:inline-flex"
        >
          <Plus className="h-4 w-4" /> Register Pharmacy
        </Link>
      </header>

      {/* Mobile search */}
      <div className="relative mt-5 md:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicine or scan barcode..."
          className="h-11 w-full rounded-lg bg-surface-low pl-10 pr-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
        />
      </div>

      {/* Mobile pill tabs */}
      <div className="mt-4 flex flex-wrap gap-2 md:hidden">
        {(["all", "active", "expired", "trial"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-9 shrink-0 rounded-md px-4 text-sm font-semibold capitalize",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary hover:bg-surface-low",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 md:hidden">
        <span className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Filters:
        </span>
        <CityFilter cities={cities} value={city} onChange={setCity} />
        <TierFilter value={tier} onChange={setTier} />
      </div>

      {/* Mobile card list */}
      <div className="mt-4 space-y-3 md:hidden">
        {visible.map((p) => (
          <Link
            key={p.id}
            to="/admin/pharmacies/$pharmacyId"
            params={{ pharmacyId: p.id }}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-elev-sm"
          >
            <span
              className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[p.subscription_status])}
              aria-label={p.subscription_status}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.city}
                {p.country ? `, ${p.country}` : ""}
              </p>
            </div>
            <TierBadge tier={p.tier} />
          </Link>
        ))}
        {!loading && visible.length === 0 && (
          <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No pharmacies match these filters.
          </p>
        )}
      </div>

      {/* Desktop table */}
      <AdminCard className="mt-6 hidden overflow-hidden md:block">
        <AdminTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All", count: counts.all },
            { value: "active", label: "Active", count: counts.active },
            { value: "expired", label: "Expired", count: counts.expired },
            { value: "trial", label: "Trial", count: counts.trial },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-low px-5 py-3">
          <span className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Filters:
          </span>
          <CityFilter cities={cities} value={city} onChange={setCity} />
          <TierFilter value={tier} onChange={setTier} />
        </div>
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-border font-mono-data text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="w-[32%] px-5 py-3 text-left">Pharmacy name</th>
              <th className="w-[18%] px-5 py-3 text-left">City</th>
              <th className="w-[20%] px-5 py-3 text-left">Subscription status</th>
              <th className="w-[15%] px-5 py-3 text-left">Tier</th>
              <th className="w-[15%] px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="truncate px-5 py-4 text-sm font-bold text-foreground">{p.name}</td>
                <td className="truncate px-5 py-4 font-mono-data text-sm text-foreground">{p.city}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={p.subscription_status} />
                </td>
                <td className="px-5 py-4">
                  <TierBadge tier={p.tier} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to="/admin/pharmacies/$pharmacyId"
                    params={{ pharmacyId: p.id }}
                    className="inline-flex h-9 items-center rounded-md bg-primary-soft px-4 text-sm font-semibold text-primary hover:bg-surface-low"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="px-5 py-6 text-sm text-muted-foreground">Loading pharmacies…</p>}
        {error && <p className="px-5 py-6 text-sm text-danger">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <p className="px-5 py-6 text-sm text-muted-foreground">No pharmacies match these filters.</p>
        )}
      </AdminCard>

      {/* Mobile FAB */}
      <Link
        to="/admin/register"
        aria-label="Register pharmacy"
        className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-xl bg-primary text-primary-foreground shadow-elev-sm md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </AdminShell>
  );
}

function CityFilter({
  cities,
  value,
  onChange,
}: {
  cities: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground"
    >
      <option value="all">All Cities</option>
      {cities.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function TierFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-surface px-2 text-sm capitalize text-foreground"
    >
      <option value="all">All Tiers</option>
      <option value="basic">Basic</option>
      <option value="pro">Pro</option>
      <option value="enterprise">Enterprise</option>
    </select>
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const tone =
    status === "active"
      ? "bg-primary-soft text-primary"
      : status === "expired"
        ? "border border-danger text-danger"
        : "bg-warning-soft text-warning";
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-1 font-mono-data text-[11px] font-bold uppercase tracking-wide",
        tone,
      )}
    >
      {status}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-flex shrink-0 rounded border border-border bg-primary-soft px-2 py-1 font-mono-data text-[11px] font-bold uppercase tracking-wide text-primary">
      {tier}
    </span>
  );
}
