import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/hooks/use-session";
import { inviteStaff, type StaffRole } from "@/services/admin/staffService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/add")({
  head: () => ({
    meta: [
      { title: "Add Staff · Phamda" },
      {
        name: "description",
        content:
          "Invite a new pharmacist, cashier, or clerk to your pharmacy. Phamda sends them a secure email link to set their password.",
      },
      { property: "og:title", content: "Add Staff · Phamda" },
      {
        property: "og:description",
        content: "Email-based staff invitations with secure onboarding.",
      },
    ],
  }),
  component: AddStaffPage,
});

function AddStaffPage() {
  return (
    <RequireRole roles={["owner"]}>
      <AddStaffView />
    </RequireRole>
  );
}

const ROLE_OPTIONS: Array<{ id: StaffRole; label: string; hint: string }> = [
  { id: "pharmacist", label: "Pharmacist", hint: "Full clinical + dispensing access" },
  { id: "cashier", label: "Cashier", hint: "POS checkout & daily reconciliation" },
];

function AddStaffView() {
  const navigate = useNavigate();
  const { pharmacyId } = useSession();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    role: "" as "" | StaffRole,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const canSubmit =
    !!form.first_name.trim() &&
    !!form.last_name.trim() &&
    !!form.phone_number.trim() &&
    /.+@.+\..+/.test(form.email) &&
    !!form.role &&
    !!pharmacyId &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !pharmacyId || !form.role) return;
    setError(null);
    setSubmitting(true);
    try {
      await inviteStaff({
        pharmacy_id: pharmacyId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
      });
      setSuccess(
        `Invitation email sent to ${form.email.trim()}. They'll set their password from the link.`,
      );
      setTimeout(() => void navigate({ to: "/profile" }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite staff");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell hideBell>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <Link
          to="/profile"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* --- Form card --- */}
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm sm:p-6"
          >
            <header>
              <h1 className="text-xl font-bold tracking-tight">Staff Registration</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a new account for a member of your pharmacy team.
              </p>
            </header>

            {/* Section 1 */}
            <SectionHeader label="Personal Information" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="First name"
                placeholder="e.g. Jane"
                icon={User}
                value={form.first_name}
                onChange={(v) => set("first_name", v)}
              />
              <TextField
                label="Last name"
                placeholder="e.g. Smith"
                icon={User}
                value={form.last_name}
                onChange={(v) => set("last_name", v)}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Phone number"
                  placeholder="+251 ..."
                  icon={Phone}
                  value={form.phone_number}
                  onChange={(v) => set("phone_number", v)}
                />
              </div>
            </div>

            {/* Section 2 */}
            <SectionHeader label="Credentials & Role" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Email address"
                placeholder="staff@pharmacy.com"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
              />
              <label className="block">
                <span className="mb-1 block font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Access role
                </span>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={form.role}
                    onChange={(e) => set("role", e.target.value as StaffRole)}
                    className="h-10 w-full appearance-none rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="" disabled>
                      Select staff role…
                    </option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-success-soft bg-success-soft/40 px-3 py-2 text-xs text-success-soft-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Link
                to="/profile"
                className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60",
                )}
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? "Sending invite…" : "Add New User"}
              </button>
            </div>
          </form>

          {/* --- Sidebar --- */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
              <header className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <h2 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
                  Permission Levels
                </h2>
              </header>
              <ul className="space-y-3 text-xs">
                <PermItem
                  color="bg-primary-soft text-primary"
                  title="Pharmacist"
                  body="Full access to prescriptions, dispensing, and medical reporting."
                />
                <PermItem
                  color="bg-warning-soft text-warning-soft-foreground"
                  title="Cashier"
                  body="Limited to checkout operations, sales records, and daily reconciliations."
                />
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-primary-soft/40 p-5 shadow-elev-sm">
              <header className="mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
                  Pharmacy Linking
                </h2>
              </header>
              <p className="text-xs leading-relaxed text-muted-foreground">
                All users created here are automatically linked to your pharmacy. They share the
                centralized inventory and sales database of your branch.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-primary to-primary-hover p-5 text-primary-foreground shadow-elev-sm">
              <GraduationCap className="mb-2 h-5 w-5 opacity-90" />
              <h3 className="text-sm font-bold">Training Guide</h3>
              <p className="mt-1 text-xs opacity-90">
                Help your new staff get onboarded with Phamda tutorials.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-primary" />
      <h3 className="text-sm font-bold">{label}</h3>
    </div>
  );
}

function TextField({
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono-data text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>
    </label>
  );
}

function PermItem({ color, title, body }: { color: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md", color)}>
        <ShieldCheck className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}