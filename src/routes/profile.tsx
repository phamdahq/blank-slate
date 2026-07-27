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
                {pharmacy?.name ? ` · ${pharmacy.name}` : ""}
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

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
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
              {!online && (
                <p className="text-[11px] text-muted-foreground">
                  Saved offline — will sync when you reconnect.
                </p>
              )}
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

          {/* Sync health */}
          <Card icon={Activity} title="System Health">
            <ul className="space-y-2.5 text-sm">
              <Health label="Connection" value={online ? "Online" : "Offline"} tone={online ? "success" : "warning"} />
              <Health
                label="Pending sync"
                value={`${queued ?? 0} queued`}
                tone={(queued ?? 0) > 0 ? "warning" : "success"}
              />
              <Health label="Local cache" value="Active" tone="success" />
              <Health
                label="Payment accounts"
                value={`${accounts?.length ?? 0} configured`}
                tone={(accounts?.length ?? 0) > 0 ? "success" : "warning"}
              />
            </ul>
          </Card>
        </div>

        {/* Subscription */}
        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card icon={Sparkles} title="Current Plan">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
                {(pharmacy?.tier ?? "basic").toUpperCase()} plan
              </span>
              <span className="text-xs text-muted-foreground">
                {pharmacy?.next_payment_due ? `Renews ${pharmacy.next_payment_due}` : "Trial"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Status: {pharmacy?.subscription_status ?? "trial"}
            </p>
            <button
              onClick={() => setPayOpen(true)}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <CreditCard className="h-4 w-4" /> Pay Now
            </button>
          </Card>

          <div className="lg:col-span-2">
            <Card icon={Landmark} title="Pharmacy Payment Accounts">
              {accounts && accounts.length > 0 ? (
                <ul className="space-y-2">
                  {accounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-md border border-border bg-surface-low px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold uppercase">
                        {a.provider === "cbe" ? "CBE" : "Telebirr"}
                      </span>
                      <span className="text-right">
                        <span className="block font-mono-data font-bold">{a.account_number}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {a.account_name}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active Telebirr or CBE account configured for this pharmacy yet.
                </p>
              )}
            </Card>
          </div>
        </section>
      </div>

      {payOpen && <PaymentSheet onClose={() => setPayOpen(false)} />}
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
  icon: typeof Activity;
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

function Health({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger";
}) {
  const dot = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-2 font-mono-data text-xs font-semibold text-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {value}
      </span>
    </li>
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

function PaymentSheet({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<Awaited<
    ReturnType<typeof import("@/services/platformConfigService").getPlatformConfig>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import("@/services/platformConfigService")
      .then(({ getPlatformConfig }) => getPlatformConfig())
      .then((data) => {
        if (cancelled) return;
        setCfg(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load payment details");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-t-2xl border-x border-t border-border bg-surface shadow-elev-lg sm:rounded-2xl sm:border">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-bold">Subscription payment</h3>
            <p className="text-xs text-muted-foreground">
              Transfer using either destination below, then contact support with the reference.
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
        <div className="space-y-4 px-5 py-5">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading payment details…</p>
          )}
          {error && !loading && (
            <p className="text-sm text-danger">{error}</p>
          )}
          {!loading && !error && !cfg && (
            <p className="text-sm text-muted-foreground">
              Payment details are not configured yet. Please contact Phamda support.
            </p>
          )}
          {!loading && !error && cfg && (
            <>
              <PayRow
                icon={Landmark}
                label="CBE Account"
                value={cfg.cbe_account_number ?? "—"}
              />
              <PayRow icon={CreditCard} label="Telebirr" value={cfg.telebirr ?? "—"} />
              <PayRow
                icon={UserCog}
                label="Account name"
                value={cfg.payment_full_name ?? "—"}
              />
              {cfg.support_phone_number && (
                <p className="text-xs text-muted-foreground">
                  Support: <span className="font-mono-data">{cfg.support_phone_number}</span>
                </p>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Got it
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

function PayRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-low px-3 py-2.5 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </span>
      <span className="font-mono-data font-bold">{value}</span>
    </div>
  );
}

