import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCard } from "@/components/admin/admin-primitives";
import { RequirePlatformOwner } from "@/components/require-platform-owner";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  adminSignOut,
  changeOwnPassword,
  getPlatformAdmin,
  getPlatformSnapshot,
  updatePlatformAdmin,
  type PlatformAdminRow,
} from "@/services/admin/adminProfileService";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [
      { title: "Admin profile · Phamda Master Console" },
      {
        name: "description",
        content:
          "Your Phamda platform administrator account: contact details, role, platform snapshot, password and sign out.",
      },
      { property: "og:title", content: "Admin profile · Phamda Master Console" },
      {
        property: "og:description",
        content: "Manage your Phamda platform administrator account and session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePlatformOwner>
      <AdminProfilePage />
    </RequirePlatformOwner>
  ),
});

const ROLE_LABEL: Record<string, string> = {
  platform_owner: "Platform owner",
  support_admin: "Support admin",
  finance_admin: "Finance admin",
};

function AdminProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [admin, setAdmin] = useState<PlatformAdminRow | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<
    ReturnType<typeof getPlatformSnapshot>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [password, setPassword] = useState("");
  const [pwState, setPwState] = useState<"idle" | "saving" | "done">("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getPlatformAdmin(user.id), getPlatformSnapshot()])
      .then(([row, snap]) => {
        if (cancelled) return;
        setAdmin(row);
        setSnapshot(snap);
        if (row) {
          setForm({
            first_name: row.first_name,
            last_name: row.last_name,
            phone_number: row.phone_number,
          });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load your account.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const row = await updatePlatformAdmin(user.id, form);
      setAdmin(row);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  }

  async function submitPassword() {
    setPwError(null);
    if (password.length < 8) {
      setPwError("Use at least 8 characters.");
      return;
    }
    setPwState("saving");
    try {
      await changeOwnPassword(password);
      setPassword("");
      setPwState("done");
      window.setTimeout(() => setPwState("idle"), 2500);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Could not update password.");
      setPwState("idle");
    }
  }

  async function signOut() {
    await adminSignOut();
    void navigate({ to: "/login", replace: true });
  }

  const initials =
    `${form.first_name.charAt(0)}${form.last_name.charAt(0)}`.trim().toUpperCase() || "PA";

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Identity header */}
        <AdminCard className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary-soft font-mono-data text-lg font-bold text-primary">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-foreground">
                {loading ? "Loading…" : `${form.first_name} ${form.last_name}`.trim() || "Administrator"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {admin?.email ?? user?.email ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {form.phone_number || "—"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {ROLE_LABEL[admin?.role ?? ""] ?? "Administrator"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono-data text-[11px] font-bold uppercase tracking-wider",
                    admin?.is_active === false
                      ? "bg-danger-soft text-danger"
                      : "bg-success-soft text-success",
                  )}
                >
                  {admin?.is_active === false ? "Deactivated" : "Active"}
                </span>
                {admin?.created_at && (
                  <span className="inline-flex items-center gap-1.5 font-mono-data text-[11px] uppercase tracking-wider text-subtle-foreground">
                    <Clock className="h-3.5 w-3.5" /> Joined{" "}
                    {new Date(admin.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-danger px-5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </AdminCard>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Platform snapshot */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Building2 className="h-4 w-4" />}
            label="Pharmacies"
            value={snapshot?.pharmacies}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Active subscriptions"
            value={snapshot?.activePharmacies}
          />
          <StatCard
            icon={<TriangleAlert className="h-4 w-4" />}
            label="Payment due / overdue"
            value={snapshot?.overduePharmacies}
            tone="warning"
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Platform admins"
            value={snapshot?.admins}
          />
        </div>

        {/* Account details */}
        <AdminCard className="p-6">
          <SectionTitle icon={<UserCog className="h-4 w-4" />} title="Account details" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              value={form.first_name}
              onChange={(v) => setForm((f) => ({ ...f, first_name: v }))}
            />
            <Field
              label="Last name"
              value={form.last_name}
              onChange={(v) => setForm((f) => ({ ...f, last_name: v }))}
            />
            <Field
              label="Phone number"
              value={form.phone_number}
              onChange={(v) => setForm((f) => ({ ...f, phone_number: v }))}
            />
            <div>
              <label className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Email (read-only)
              </label>
              <input
                readOnly
                value={admin?.email ?? user?.email ?? ""}
                className="mt-1.5 h-11 w-full rounded-md border border-border bg-surface-low px-3 text-sm text-muted-foreground"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </AdminCard>

        {/* Security */}
        <AdminCard className="p-6">
          <SectionTitle icon={<KeyRound className="h-4 w-4" />} title="Security" />
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set a new password for your platform administrator account.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field
                label="New password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
              />
            </div>
            <button
              type="button"
              disabled={pwState === "saving"}
              onClick={() => void submitPassword()}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-low disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {pwState === "saving" ? "Updating…" : "Update password"}
            </button>
          </div>
          {pwError && <p className="mt-3 text-sm font-semibold text-danger">{pwError}</p>}
          {pwState === "done" && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> Password updated
            </p>
          )}
        </AdminCard>

        {/* Session */}
        <AdminCard className="p-6">
          <SectionTitle icon={<LogOut className="h-4 w-4" />} title="Session" />
          <p className="mt-1.5 text-sm text-muted-foreground">
            Logging out ends this session on this device and clears cached console data.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-danger px-5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 sm:w-auto"
          >
            <LogOut className="h-4 w-4" /> Log out of Phamda Admin
          </button>
        </AdminCard>
      </div>
    </AdminShell>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary-soft text-primary">
        {icon}
      </span>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  tone?: "warning";
}) {
  return (
    <AdminCard className="p-5">
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md",
          tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary",
        )}
      >
        {icon}
      </span>
      <p className="mt-3 font-mono-data text-2xl font-bold text-foreground">
        {value === undefined ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </AdminCard>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
      />
    </div>
  );
}
