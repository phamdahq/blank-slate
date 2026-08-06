import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import { SUPPLIER_PROFILE } from "@/lib/supplier-mock";

export const Route = createFileRoute("/supplier/profile")({
  head: () => ({
    meta: [
      { title: "Company profile · Phamda Supplier Portal" },
      {
        name: "description",
        content: "Update supplier company details, contact information and payout accounts.",
      },
      { property: "og:title", content: "Company profile · Phamda Supplier Portal" },
      {
        property: "og:description",
        content: "Update supplier company details, contact information and payout accounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierProfile,
});

function SupplierProfile() {
  const [form, setForm] = useState(SUPPLIER_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 700);
  }

  return (
    <SupplierShell title="Profile" subtitle="Company account, address and payout details">
      <form onSubmit={submit} className="space-y-6">
        <Section title="Company">
          <Field label="Company name" value={form.company_name} onChange={(v) => set("company_name", v)} />
          <Field label="Wholesale license" value={form.license_number} onChange={(v) => set("license_number", v)} />
        </Section>

        <Section title="Contact">
          <Field label="Contact person" value={form.contact_name} onChange={(v) => set("contact_name", v)} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
        </Section>

        <Section title="Business address">
          <Field label="Address" value={form.address_line} onChange={(v) => set("address_line", v)} />
          <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
        </Section>

        <Section title="Banking & payout">
          <Field label="Bank name" value={form.bank_name} onChange={(v) => set("bank_name", v)} />
          <Field label="Account name" value={form.account_name} onChange={(v) => set("account_name", v)} />
          <Field label="Account number" value={form.account_number} onChange={(v) => set("account_number", v)} />
          <Field label="Telebirr number" value={form.telebirr} onChange={(v) => set("telebirr", v)} />
        </Section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm font-semibold text-success">Changes saved</span>}
        </div>
      </form>
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
