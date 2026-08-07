import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Landmark,
  LogOut,
  Mail,
  Phone as PhoneIcon,
  Plus,
  Save,
  Settings2,
  ClipboardList,
  Sparkles,
  Users,
  UserCog,
  Wallet,
} from "lucide-react";
import { RequireRole } from "@/components/require-role";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/hooks/use-session";
import { useOnline } from "@/hooks/use-online";
import { db } from "@/db/dexie";
import { supabase } from "@/db/supabase";
import {
  DEFAULT_SETTINGS,
  clearLocalSession,
  profileRepo,
  settingsRepo,
} from "@/db/pharmacy-config";
import { submitPayout } from "@/services/admin/payoutService";
import { recordPaymentSuccess } from "@/lib/billing";
import { listStaff, setStaffActive } from "@/services/admin/staffService";
import type { UserRow } from "@/db/dexie";
import { orderSettingsRepo } from "@/db/orders";
import { useOrdersEnabled } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings · Phamda" },
      {
        name: "description",
        content:
          "Manage your Phamda account, inventory thresholds, payment accounts, and session.",
      },
      { property: "og:title", content: "Profile & Settings · Phamda" },
      {
        property: "og:description",
        content:
          "Offline-first profile management with synced inventory rules for your pharmacy.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireRole roles={["owner", "pharmacist", "cashier"]}>
      <ProfilePageView />
    </RequireRole>
  );
}

function ProfilePageView() {
  const navigate = useNavigate();
  const { user, profile, role, pharmacyId } = useSession();
  const online = useOnline();
  const [payOpen, setPayOpen] = useState(false);
  const canEditRules = role === "owner";

  // --- Live Dexie mirrors -------------------------------------------------
  const settings = useLiveQuery(
    () => (pharmacyId ? settingsRepo.local(pharmacyId) : undefined),
    [pharmacyId],
  );
  const pharmacy = useLiveQuery(
    () => (pharmacyId ? db.pharmacies.get(pharmacyId) : undefined),
    [pharmacyId],
  );

  // Refresh from Supabase whenever we come online.
  useEffect(() => {
    if (!pharmacyId) return;
    void settingsRepo.refresh(pharmacyId);
  }, [pharmacyId, online]);

  // --- Profile edit -------------------------------------------------------
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "" });
  const [savedProfile, setSavedProfile] = useState(false);
  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      phone_number: profile.phone_number ?? "",
    });
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const patch = {
      first_name: form.first_name.trim().slice(0, 80),
      last_name: form.last_name.trim().slice(0, 80),
      phone_number: form.phone_number.trim().slice(0, 32),
    };
    if (!patch.first_name || !patch.last_name || !patch.phone_number) return;
    await profileRepo.update(user.id, patch);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  // --- Inventory rules ----------------------------------------------------
  const expireLevel = settings?.expire_level ?? DEFAULT_SETTINGS.expire_level;
  const deadstock = settings?.deadstock ?? DEFAULT_SETTINGS.deadstock;

  async function saveRule(patch: { expire_level?: number; deadstock?: number }) {
    if (!pharmacyId || !canEditRules) return;
    await settingsRepo.save({
      pharmacy_id: pharmacyId,
      expire_level: patch.expire_level ?? expireLevel,
      deadstock: patch.deadstock ?? deadstock,
    });
  }

  // --- Order management toggle -------------------------------------------
  const ordersEnabled = useOrdersEnabled(pharmacyId);

  // --- Sign out -----------------------------------------------------------
  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      await clearLocalSession();
      void navigate({ to: "/login" });
    }
  }

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "—";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "··";

  return (
    <AppShell hideBell>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-soft text-primary text-lg font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight">{fullName}</h1>
              <p className="text-sm text-muted-foreground">
                {(role ?? "member").replace(/^\w/, (c) => c.toUpperCase())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-8 w-fit items-center gap-1.5 rounded-full px-3 font-mono-data text-[11px] font-bold uppercase tracking-wider",
                online
                  ? "bg-success-soft text-success-soft-foreground"
                  : "bg-warning-soft text-warning-soft-foreground",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {online ? "Online" : "Offline"}
            </span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-3 text-sm font-semibold text-danger-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </header>

        {/* Pharmacy banner */}
        <section className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary-soft/70 to-surface px-5 py-4 shadow-elev-sm">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
              Pharmacy
            </p>
            <h2 className="truncate text-xl font-bold leading-tight">
              {pharmacy?.name ?? "—"}
            </h2>
            {(pharmacy?.city || pharmacy?.country) && (
              <p className="text-xs text-muted-foreground">
                {[pharmacy?.city, pharmacy?.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Account details */}
          <Card icon={UserCog} title="Account Details">
            <form onSubmit={saveProfile} className="space-y-3">
              <Field
                label="First name"
                value={form.first_name}
                onChange={(v) => setForm((s) => ({ ...s, first_name: v }))}
              />
              <Field
                label="Last name"
                value={form.last_name}
                onChange={(v) => setForm((s) => ({ ...s, last_name: v }))}
              />
              <Field
                label="Phone number"
                value={form.phone_number}
                onChange={(v) => setForm((s) => ({ ...s, phone_number: v }))}
              />
              <div className="text-xs text-muted-foreground">
                {profile?.email ?? user?.email ?? "—"}
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Save className="h-4 w-4" />
                {savedProfile ? "Saved locally" : "Save changes"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                {online
                  ? "Saved locally and synced to the cloud."
                  : "Saved offline — will sync when you reconnect."}
              </p>
            </form>
          </Card>

          {/* Inventory rules */}
          <Card icon={Settings2} title="Inventory Rules">
            <div className="space-y-4">
              <RuleSlider
                label="Expiry warning threshold"
                value={expireLevel}
                min={15}
                max={365}
                step={15}
                unit="days"
                disabled={!canEditRules}
                onChange={(v) => void saveRule({ expire_level: v })}
              />
              <RuleSlider
                label="Stagnant / deadstock threshold"
                value={deadstock}
                min={15}
                max={365}
                step={15}
                unit="days"
                disabled={!canEditRules}
                onChange={(v) => void saveRule({ deadstock: v })}
              />
              {!canEditRules && (
                <p className="text-[11px] text-muted-foreground">
                  Only the pharmacy owner can change these thresholds.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Order management (owner only) */}
        {role === "owner" && pharmacyId && (
          <section className="mt-6">
            <Card icon={ClipboardList} title="Order Management">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Enable the Orders tab</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When enabled, the POS button becomes “Order” and each checkout is sent
                    to the Orders queue for a cashier to collect payment.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ordersEnabled}
                  onClick={() => void orderSettingsRepo.setEnabled(pharmacyId, !ordersEnabled)}
                  className={cn(
                    "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                    ordersEnabled ? "bg-primary" : "bg-surface-mid",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-surface shadow-elev-sm transition-transform",
                      ordersEnabled ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            </Card>
          </section>
        )}

        {/* Subscription */}
        <section className="mt-6">
          <Card icon={Sparkles} title="Current Plan">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
                    {(pharmacy?.tier ?? "basic").toUpperCase()} plan
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pharmacy?.next_payment_due
                      ? `Renews ${pharmacy.next_payment_due}`
                      : "Trial"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Status: {pharmacy?.subscription_status ?? "trial"}
                </p>
              </div>
              <button
                onClick={() => setPayOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <CreditCard className="h-4 w-4" /> Pay Now
              </button>
            </div>
          </Card>
        </section>

        {role === "owner" && pharmacyId && (
          <section className="mt-6">
            <StaffManagement pharmacyId={pharmacyId} currentUserId={user?.id ?? null} />
          </section>
        )}
      </div>

      {payOpen && (
        <PaymentSheet
          tier={pharmacy?.tier ?? "basic"}
          pharmacyId={pharmacyId ?? null}
          onClose={() => setPayOpen(false)}
        />
      )}
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <header className="mb-4 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function RuleSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-mono-data text-sm font-bold text-foreground">
          {value} {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary disabled:opacity-50"
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          aria-label={`${label} in days`}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
          className="h-9 w-20 rounded-md border border-border bg-background px-2 font-mono-data text-sm outline-none focus:border-primary disabled:opacity-50"
        />
      </div>
    </div>
  );
}

// ---------- Subscription payment modal (POS-style) ----------

type PayMethod = "cash" | "cbe" | "telebirr";

const TIER_AMOUNTS: Record<string, number> = {
  basic: 2500,
  pro: 4500,
  enterprise: 6500,
};

function PaymentSheet({
  tier,
  pharmacyId,
  onClose,
}: {
  tier: string;
  pharmacyId: string | null;
  onClose: () => void;
}) {
  const amount = TIER_AMOUNTS[tier] ?? TIER_AMOUNTS.basic;
  const [cfg, setCfg] = useState<Awaited<
    ReturnType<typeof import("@/services/platformConfigService").getPlatformConfig>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>("cbe");
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import("@/services/platformConfigService")
      .then(({ getPlatformConfig }) => getPlatformConfig())
      .then((data) => {
        if (!cancelled) setCfg(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load payment details");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const details = useMemo(() => {
    if (!cfg || !method || method === "cash") return null;
    if (method === "cbe")
      return { label: "CBE Account", value: cfg.cbe_account_number ?? "—" };
    return { label: "Telebirr", value: cfg.telebirr ?? "—" };
  }, [cfg, method]);

  const methods: Array<{ id: PayMethod; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "cbe", label: "CBE", icon: Landmark },
    { id: "telebirr", label: "Telebirr", icon: CreditCard },
    { id: "cash", label: "Cash", icon: Wallet },
  ];

  const needsTxn = method === "cbe" || method === "telebirr";
  const canConfirm = !submitting && !!method && (!needsTxn || txnId.trim().length >= 3);

  async function handleConfirm() {
    if (!canConfirm) return;
    setError(null);
    setSubmitting(true);
    try {
      if (!pharmacyId) throw new Error("Missing pharmacy context");
      const methodLabel: "Cash" | "CBE" | "Telebirr" =
        method === "cash" ? "Cash" : method === "cbe" ? "CBE" : "Telebirr";
      const reference = needsTxn
        ? txnId.trim()
        : `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await submitPayout({
        pharmacy_id: pharmacyId,
        platform_config_id: cfg?.id ?? null,
        amount,
        payment_method: methodLabel,
        transaction_reference: reference,
      });
      // Payment accepted: roll the due date forward, reactivate the
      // subscription in Supabase and unlock the app locally.
      await recordPaymentSuccess(pharmacyId);
      setConfirmed(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg rounded-t-2xl border-x border-t border-border bg-surface shadow-elev-lg sm:rounded-2xl sm:border">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={onClose}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-md text-primary hover:bg-surface-low"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h3 className="text-base font-bold text-primary">Payment &amp; Subscription</h3>
          <button
            aria-label="Help"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-surface-low"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </header>

        <div className="px-4 pt-4">
          {/* Current plan card */}
          <div className="flex items-center justify-between rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-elev-sm">
            <div>
              <p className="font-mono-data text-[11px] font-bold uppercase tracking-wider opacity-80">
                Current Plan
              </p>
              <p className="mt-1 text-2xl font-bold capitalize leading-tight">
                {tier} Plan
              </p>
            </div>
            <span className="rounded-full bg-primary-hover/60 px-4 py-1.5 text-xs font-bold ring-1 ring-white/10">
              Active
            </span>
          </div>

          {/* Total row */}
          <div className="mt-3 flex items-center justify-between border-b border-border px-1 py-4">
            <span className="text-sm text-muted-foreground">Total Amount Due</span>
            <span className="font-mono-data text-2xl font-bold tracking-tight text-foreground">
              {amount.toLocaleString()} ETB
            </span>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Method cards */}
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => {
              const active = method === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMethod(m.id);
                    setConfirmed(false);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface-low text-foreground hover:bg-surface-mid",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Account details */}
          {loading && (
            <p className="text-sm text-muted-foreground">Loading payment details…</p>
          )}
          {error && !loading && <p className="text-sm text-danger">{error}</p>}
          {!loading && !error && details && (
            <div className="rounded-lg border border-border bg-surface-low p-4">
              <p className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {details.label}
              </p>
              <p className="mt-1 font-mono-data text-lg font-bold">{details.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Account name:{" "}
                <span className="font-semibold text-foreground">
                  {cfg?.payment_full_name ?? "—"}
                </span>
              </p>
              <label className="mt-3 block">
                <span className="mb-1 block font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Transaction ID
                </span>
                <input
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  placeholder="Enter reference from your receipt"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono-data text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
            </div>
          )}
          {!loading && !error && method === "cash" && (
            <div className="rounded-lg border border-border bg-surface-low p-4 text-sm text-muted-foreground">
              Pay cash directly at the office and keep your receipt for reference.
            </div>
          )}

          {/* Confirm */}
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
              canConfirm
                ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                : "cursor-not-allowed bg-surface-mid text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border-2",
                confirmed
                  ? "border-primary-foreground bg-primary-foreground text-primary"
                  : "border-current",
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            {confirmed ? "Submitted for review" : submitting ? "Submitting…" : "Confirm payment"}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

// ---------- Staff Management (owner-only) ----------

function StaffManagement({
  pharmacyId,
  currentUserId,
}: {
  pharmacyId: string;
  currentUserId: string | null;
}) {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await listStaff(pharmacyId);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId]);

  async function toggle(u: UserRow) {
    setBusyId(u.id);
    setError(null);
    try {
      await setStaffActive(u.id, !u.is_active);
      setRows((prev) =>
        prev ? prev.map((r) => (r.id === u.id ? { ...r, is_active: !u.is_active } : r)) : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
            <Users className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
            Staff Management
          </h2>
        </div>
        <Link
          to="/staff/add"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> Add new staff
        </Link>
      </header>

      {error && (
        <div className="mb-3 rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {rows === null ? (
        <p className="text-xs text-muted-foreground">Loading staff…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No team members yet. Invite your first staff to get started.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((u) => {
            const isSelf = u.id === currentUserId;
            const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—";
            const initials =
              name
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "··";
            return (
              <li
                key={u.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono-data text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {u.role}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {u.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </span>
                      )}
                      {u.phone_number && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="h-3 w-3" /> {u.phone_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  {u.role === "owner" || isSelf ? (
                    <span
                      className={cn(
                        "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold",
                        u.is_active
                          ? "bg-success-soft text-success-soft-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                      title={
                        isSelf
                          ? "You cannot deactivate yourself"
                          : "Owners cannot be deactivated here"
                      }
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  ) : (
                    <button
                      disabled={busyId === u.id}
                      onClick={() => void toggle(u)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition-colors disabled:opacity-50",
                        u.is_active
                          ? "bg-success-soft text-success-soft-foreground hover:bg-danger-soft hover:text-danger"
                          : "bg-muted text-muted-foreground hover:bg-success-soft hover:text-success-soft-foreground",
                      )}
                      title={u.is_active ? "Click to deactivate" : "Click to activate"}
                    >
                      {busyId === u.id ? "…" : u.is_active ? "Active" : "Inactive"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
