import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SupplierShell, SupplierState } from "@/components/supplier/supplier-shell";
import {
  useSupplierContext,
  useSupplierProfile,
  useUpdateSupplierProfile,
} from "@/hooks/use-supplier";
import type { SupplierProfileUpdate } from "@/services/supplier/supplierService";

export const Route = createFileRoute("/supplier/profile")({
  head: () => ({
    meta: [
      { title: "Company profile · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Update supplier company details, contact information and business settings.",
      },
      { property: "og:title", content: "Company profile · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Update supplier company details, contact information and business settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierProfile,
});

const EMPTY: SupplierProfileUpdate = {
  company_name: "",
  city: "",
  country: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_email: "",
  contact_phone: "",
  company_phone: "",
};

function SupplierProfile() {
  const { data: ctx, isLoading: ctxLoading, error: ctxError } = useSupplierContext();
  const { data: profile, isLoading, error } = useSupplierProfile(ctx);
  const save = useUpdateSupplierProfile(ctx);

  const [form, setForm] = useState<SupplierProfileUpdate>(EMPTY);

  useEffect(() => {
    if (!profile) return;
    setForm({
      company_name: profile.company_name,
      city: profile.city,
      country: profile.country,
      contact_first_name: profile.contact_first_name,
      contact_last_name: profile.contact_last_name,
      contact_email: profile.contact_email,
      contact_phone: profile.contact_phone,
      company_phone: profile.company_phone,
    });
  }, [profile]);

  const busy = ctxLoading || isLoading;
  const err = ctxError ?? error;

  function set<K extends keyof SupplierProfileUpdate>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <SupplierShell title="Profile" subtitle="Company account, contact and subscription details">
      {(busy || err || !profile) && <SupplierState loading={busy} error={err} />}

      {!busy && !err && profile && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="space-y-6"
        >
          <Section title="Company">
            <Field
              label="Company name"
              value={form.company_name}
              onChange={(v) => set("company_name", v)}
            />
            <Field
              label="Company phone"
              value={form.company_phone}
              onChange={(v) => set("company_phone", v)}
            />
          </Section>

          <Section title="Contact person">
            <Field
              label="First name"
              value={form.contact_first_name}
              onChange={(v) => set("contact_first_name", v)}
            />
            <Field
              label="Last name"
              value={form.contact_last_name}
              onChange={(v) => set("contact_last_name", v)}
            />
            <Field
              label="Email"
              type="email"
              value={form.contact_email}
              onChange={(v) => set("contact_email", v)}
            />
            <Field
              label="Phone"
              value={form.contact_phone}
              onChange={(v) => set("contact_phone", v)}
            />
          </Section>

          <Section title="Business address">
            <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
            <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
          </Section>

          <Section title="Subscription">
            <ReadOnly label="Plan" value={profile.tier} />
            <ReadOnly label="Status" value={profile.subscription_status} />
            <ReadOnly label="Billing cycle" value={profile.cycle_type} />
            <ReadOnly label="Next payment due" value={profile.next_payment_due ?? "—"} />
          </Section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={save.isPending}
              className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </SupplierShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-elev-sm">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-semibold">{label}</span>
      <p className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-surface-low px-3 capitalize text-muted-foreground">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none ring-primary/30 focus:ring-2"
      />
    </label>
  );
}
