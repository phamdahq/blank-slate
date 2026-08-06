import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase, supabaseSignup } from "@/db/supabase";
import { RequirePlatformOwner } from "@/components/require-platform-owner";

import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  User,
} from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register your pharmacy · Phamda" },
      {
        name: "description",
        content: "Set up your pharmacy on Phamda and assign the owner account in minutes.",
      },
    ],
  }),
  component: RegisterRoute,
});

function RegisterRoute() {
  return (
    <RequirePlatformOwner>
      <RegisterPage />
    </RequirePlatformOwner>
  );
}


function RegisterPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    pharmacyName: "",
    country: "Ethiopia",
    city: "",
    location: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm({
      pharmacyName: "",
      country: "Ethiopia",
      city: "",
      location: "",
      ownerName: "",
      phone: "",
      email: "",
      password: "",
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const [firstName, ...rest] = form.ownerName.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    // 1. Create the owner's auth account on an isolated client so the platform
    //    owner's own session is never replaced.
    const { data: signUpData, error: signUpError } = await supabaseSignup.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: form.ownerName, phone: form.phone, pharmacy_name: form.pharmacyName },
      },
    });

    const newUserId = signUpData?.user?.id;
    if (signUpError || !newUserId) {
      setLoading(false);
      setError(signUpError?.message ?? "Could not create the owner account.");
      return;
    }

    // 2. Create the pharmacy tenant (platform owner is authenticated here).
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacies")
      .insert({
        name: form.pharmacyName.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
      })
      .select("id")
      .single();

    if (pharmacyError || !pharmacy) {
      setLoading(false);
      setError(pharmacyError?.message ?? "Could not create the pharmacy record.");
      return;
    }

    // 3. Link the new auth user as the pharmacy `owner`.
    const { error: userError } = await supabase.from("users").insert({
      id: newUserId,
      pharmacy_id: pharmacy.id,
      first_name: firstName,
      last_name: lastName,
      phone_number: form.phone.trim(),
      email: form.email.trim(),
      role: "owner",
      is_active: true,
    });

    setLoading(false);

    if (userError) {
      setError(
        `Pharmacy created, but linking the owner failed: ${userError.message}. Re-run the owner assignment.`,
      );
      return;
    }

    setSuccess(
      `${form.pharmacyName} is registered. ${form.ownerName} can now sign in at /login with ${form.email}.`,
    );
    reset();
  }


  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* Left brand rail */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,.25), transparent 45%), radial-gradient(circle at 80% 90%, rgba(255,255,255,.18), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-white/15 backdrop-blur">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Phamda</span>
        </div>

        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Register your pharmacy in minutes.
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Give us a few details about your business and set up the owner account. You can invite
            staff and configure stations later.
          </p>

          <div className="mt-8 rounded-lg border border-white/15 bg-white/5 p-4 text-sm backdrop-blur">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" /> Need help getting started?
            </div>
            <p className="mt-1.5 text-primary-foreground/80">
              Our onboarding team can migrate your existing inventory and train staff on Phamda's
              POS in under a day.
            </p>
          </div>
        </div>

        <div className="relative font-mono-data text-xs uppercase tracking-wider text-primary-foreground/60">
          © {new Date().getFullYear()} Phamda Tech
        </div>
      </aside>

      {/* Right form area */}
      <section className="px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Pill className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-primary">Phamda</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pharmacy Registration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Register the business and assign an owner account.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-6">
            <FieldGroup
              step="01"
              title="Pharmacy Information"
              icon={<Building2 className="h-4 w-4" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Pharmacy name"
                  required
                  value={form.pharmacyName}
                  onChange={(v) => set("pharmacyName", v)}
                  placeholder="Central Care Pharmacy"
                />
                <TextField
                  label="Country"
                  required
                  value={form.country}
                  onChange={(v) => set("country", v)}
                />
                <TextField
                  label="City"
                  required
                  value={form.city}
                  onChange={(v) => set("city", v)}
                  placeholder="Addis Ababa"
                />
                <TextField
                  label="Location / area"
                  icon={<MapPin className="h-4 w-4" />}
                  value={form.location}
                  onChange={(v) => set("location", v)}
                  placeholder="Addis Ababa"
                />
              </div>
            </FieldGroup>

            <FieldGroup step="02" title="Owner Account" icon={<User className="h-4 w-4" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Full name"
                  required
                  value={form.ownerName}
                  onChange={(v) => set("ownerName", v)}
                  placeholder="Dawit Solomon"
                />
                <TextField
                  label="Phone"
                  required
                  icon={<Phone className="h-4 w-4" />}
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="+251 91 555 0110"
                />
                <TextField
                  label="Email"
                  required
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  placeholder="owner@pharmacy.com"
                />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Password <span className="text-danger">*</span>
                  </span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                    <input
                      required
                      type={show ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>
            </FieldGroup>

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                By registering, you agree to Phamda's Terms and Privacy Policy.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {loading ? (
                  "Creating workspace…"
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Register pharmacy
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
            )}
            {success && (
              <p className="rounded-md bg-primary-soft px-3 py-2 text-xs font-medium text-primary">
                {success}
              </p>
            )}

          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground sm:text-left">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function FieldGroup({
  step,
  title,
  icon,
  children,
}: {
  step: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm sm:p-6">
      <header className="mb-5 flex items-center gap-2 border-b border-border pb-3">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
          {icon}
        </span>
        <h3 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
          {step} · {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground">
            {icon}
          </span>
        )}
        <input
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={
            "h-11 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 " +
            (icon ? "pl-10" : "")
          }
        />
      </div>
    </label>
  );
}
