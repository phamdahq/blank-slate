import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Landmark,
  LogOut,
  Save,
  Settings2,
  Sparkles,
  UserCog,
  Wallet,
  X,
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
      </div>

      {payOpen && (
        <PaymentSheet
          tier={pharmacy?.tier ?? "basic"}
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
  basic: 49,
  pro: 99,
  enterprise: 129,
};

function PaymentSheet({
  tier,
  onClose,
}: {
  tier: string;
  onClose: () => void;
}) {
  const amount = TIER_AMOUNTS[tier] ?? TIER_AMOUNTS.basic;
  const [cfg, setCfg] = useState<Awaited<
    ReturnType<typeof import("@/services/platformConfigService").getPlatformConfig>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
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
    { id: "cash", label: "Cash", icon: Wallet },
    { id: "cbe", label: "CBE", icon: Landmark },
    { id: "telebirr", label: "Telebirr", icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg rounded-t-2xl border-x border-t border-border bg-surface shadow-elev-lg sm:rounded-2xl sm:border">
        <header className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-bold">Subscription payment</h3>
            <p className="text-xs text-muted-foreground">
              Choose how you want to settle this cycle.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Total */}
        <div className="border-b border-border px-5 py-5 text-center">
          <p className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total amount due
          </p>
          <p className="mt-1 font-mono-data text-4xl font-bold tracking-tight text-foreground">
            ${amount.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {tier} plan
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
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
              {cfg?.support_phone_number && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Support: <span className="font-mono-data">{cfg.support_phone_number}</span>
                </p>
              )}
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
            disabled={!method}
            onClick={() => {
              setConfirmed(true);
              setTimeout(onClose, 700);
            }}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
              method
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
            {confirmed ? "Confirmed" : "Confirm"}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}


