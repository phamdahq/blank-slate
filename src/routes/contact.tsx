import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, CheckCircle2, Clock, Mail, Phone, Send, User } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Phamda — Talk to Pharmacy Support & Sales" },
      {
        name: "description",
        content:
          "Reach the Phamda team for onboarding, inventory migration, multi-branch setup or technical support. Email, phone and an inquiry form.",
      },
      { property: "og:title", content: "Contact Phamda" },
      {
        property: "og:description",
        content: "Talk to Phamda about onboarding, migration and multi-branch pharmacy setup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

type Form = {
  pharmacyName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
};

const EMPTY: Form = {
  pharmacyName: "",
  contactName: "",
  email: "",
  phone: "",
  message: "",
};

function ContactPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sent, setSent] = useState(false);

  function set<K extends keyof Form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.pharmacyName.trim()) next.pharmacyName = "Pharmacy name is required.";
    if (!form.contactName.trim()) next.contactName = "Please tell us who you are.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 7) next.phone = "Enter a reachable phone number.";
    if (form.message.trim().length < 10) next.message = "Give us at least a sentence of context.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSent(true);
    setForm(EMPTY);
  }

  return (
    <MarketingLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:py-20">
          <span className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
            Contact
          </span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            We'll help you get live
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Onboarding, inventory migration, multi-branch setup or a technical question — our team
            replies within one business day.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <aside className="space-y-4">
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            title="Email us"
            lines={["phamdahub@gmail.com"]}
          />
          <ContactCard
            icon={<Phone className="h-5 w-5" />}
            title="Call us"
            lines={["+251 965439882"]}
          />
          <ContactCard
            icon={<Clock className="h-5 w-5" />}
            title="Support hours"
            lines={["Mon–Sun · 08:00–20:00 EAT"]}
          />
        </aside>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-elev-sm sm:p-8">
          {sent ? (
            <div className="grid min-h-[380px] place-items-center text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-xl font-bold">Message received</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Thanks for reaching out. A Phamda specialist will get back to you within one
                  business day.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-border-strong px-5 text-sm font-semibold hover:bg-surface-low"
                >
                  Send another message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Send an inquiry</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us about your pharmacy and what you need.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Pharmacy name"
                  icon={<Building2 className="h-4 w-4" />}
                  value={form.pharmacyName}
                  onChange={(v) => set("pharmacyName", v)}
                  placeholder="Central Care Pharmacy"
                  error={errors.pharmacyName}
                />
                <Field
                  label="Owner / manager name"
                  icon={<User className="h-4 w-4" />}
                  value={form.contactName}
                  onChange={(v) => set("contactName", v)}
                  placeholder="Dawit Solomon"
                  error={errors.contactName}
                />
                <Field
                  label="Email"
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  placeholder="owner@pharmacy.com"
                  error={errors.email}
                />
                <Field
                  label="Phone"
                  icon={<Phone className="h-4 w-4" />}
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="+251 91 555 0110"
                  error={errors.phone}
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Message <span className="text-danger">*</span>
                </span>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="How many branches do you run? What are you using today?"
                  className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                {errors.message && (
                  <span className="mt-1 block text-xs text-danger">{errors.message}</span>
                )}
              </label>

              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:w-auto sm:px-8"
              >
                <Send className="h-4 w-4" /> Send inquiry
              </button>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

function ContactCard({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-soft text-primary">
        {icon}
      </span>
      <h3 className="mt-3 font-bold">{title}</h3>
      <div className="mt-1 space-y-0.5">
        {lines.map((l) => (
          <p key={l} className="text-sm text-muted-foreground">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label} <span className="text-danger">*</span>
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={
            "h-11 w-full rounded-md border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15 " +
            (icon ? "pl-10 " : "") +
            (error ? "border-danger" : "border-border focus:border-primary")
          }
        />
      </div>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
