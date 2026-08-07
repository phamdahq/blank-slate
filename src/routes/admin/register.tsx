import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, supabaseSignup } from "@/db/supabase";

import {
  Building2,
  CheckCircle2,
  Crosshair,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  User,
} from "lucide-react";


export const Route = createFileRoute("/admin/register")({
  head: () => ({
    meta: [
      { title: "Register your pharmacy · Phamda" },
      {
        name: "description",
        content: "Set up your pharmacy on Phamda and assign the owner account in minutes.",
      },
    ],
  }),
  component: RegisterPage,
});

/** Temporary credential the owner never sees — they set their own via "Forgot password". */
function generateTempPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Ph!${Array.from(bytes, (b) => b.toString(36)).join("")}A9`;
}

type CityRow = { id: string; name: string; country: string };

const COUNTRIES = ["Ethiopia"];

const EMPTY_FORM = {
  pharmacyName: "",
  country: "Ethiopia",
  city: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
};

function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [cities, setCities] = useState<CityRow[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "locating" | "done" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: cityError } = await supabase
        .from("cities")
        .select("id, name, country")
        .order("name");
      if (!alive) return;
      if (cityError) setGeoMessage(`Could not load cities: ${cityError.message}`);
      setCities((data as CityRow[]) ?? []);
      setCitiesLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cityOptions = cities.filter((c) => !form.country || c.country === form.country);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm(EMPTY_FORM);
    setCoords(null);
    setGeoState("idle");
    setGeoMessage(null);
  }

  /** Capture GPS coordinates and try to auto-select the matching city. */
  function detectLocation() {
    if (!("geolocation" in navigator)) {
      setGeoState("error");
      setGeoMessage("This device or browser does not support location detection.");
      return;
    }
    setGeoState("locating");
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setGeoState("done");
        setGeoMessage(`Coordinates captured: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

        // Optional reverse geocoding — best effort, never blocks registration.
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
            { headers: { Accept: "application/json" } },
          );
          if (!res.ok) return;
          const json = (await res.json()) as {
            address?: Record<string, string | undefined>;
          };
          const a = json.address ?? {};
          const guess = a["city"] ?? a["town"] ?? a["state"] ?? a["county"] ?? a["village"];
          if (!guess) return;
          const match = cities.find(
            (c) => c.name.toLowerCase() === guess.toLowerCase().trim(),
          );
          if (match) {
            setForm((f) => ({ ...f, country: match.country, city: match.name }));
            setGeoMessage(
              `Coordinates captured: ${lat.toFixed(5)}, ${lng.toFixed(5)} · matched ${match.name}`,
            );
          }
        } catch {
          /* reverse geocoding is optional */
        }
      },
      (err) => {
        setGeoState("error");
        setGeoMessage(err.message || "Could not read your current location.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    // 1. Create the owner's auth account with a random temporary password on an
    //    isolated client so the platform owner's session is never replaced. The
    //    owner sets their real password via the "Forgot password" flow.
    const { data: signUpData, error: signUpError } = await supabaseSignup.auth.signUp({
      email: form.email.trim(),
      password: generateTempPassword(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: fullName, phone: form.phone, pharmacy_name: form.pharmacyName },
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
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location_verified_by_admin: coords != null,
      })
      .select("id")
      .single();

    if (pharmacyError || !pharmacy) {
      setLoading(false);
      setError(pharmacyError?.message ?? "Could not create the pharmacy record.");
      return;
    }

    // 3. Link the new auth user as the pharmacy `owner`.
    const { error: userError } = await supabase.from("pharmacy_users").insert({
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
      `${form.pharmacyName} is registered. Ask ${fullName} to open /login, choose "Forgot password" and enter ${form.email} to set their own password.`,
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
                <SelectField
                  label="Country"
                  required
                  value={form.country}
                  onChange={(v) => set("country", v)}
                  options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                />
                <SelectField
                  label="City"
                  required
                  icon={<MapPin className="h-4 w-4" />}
                  value={form.city}
                  onChange={(v) => set("city", v)}
                  placeholder={citiesLoading ? "Loading cities…" : "Select a city"}
                  options={cityOptions.map((c) => ({ value: c.name, label: c.name }))}
                />
              </div>

              <div className="mt-4 rounded-md border border-border bg-surface-low p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={geoState === "locating"}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {geoState === "locating" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                    {geoState === "locating" ? "Detecting…" : "Detect Current Location"}
                  </button>
                  {coords && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-4 w-4" /> GPS pinned
                    </span>
                  )}
                </div>
                <p
                  className={
                    "mt-2 text-xs " +
                    (geoState === "error" ? "text-danger" : "text-muted-foreground")
                  }
                >
                  {geoMessage ??
                    "Optional. Use this on-site to pin exact coordinates; otherwise only country and city are saved."}
                </p>
              </div>
            </FieldGroup>


            <FieldGroup step="02" title="Owner Account" icon={<User className="h-4 w-4" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="First name"
                  required
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                  placeholder="Dawit"
                />
                <TextField
                  label="Last name"
                  required
                  value={form.lastName}
                  onChange={(v) => set("lastName", v)}
                  placeholder="Solomon"
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
              </div>
              <p className="mt-4 rounded-md bg-primary-soft px-3 py-2 text-xs text-primary">
                No password is set here. The owner signs in by using “Forgot password” on the login
                page and creating their own password from the emailed reset link.
              </p>
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

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "Select…",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
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
        <select
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            "h-11 w-full appearance-none rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 " +
            (icon ? "pl-10" : "")
          }
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

