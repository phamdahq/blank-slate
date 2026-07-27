import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Sparkles } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Standard & Enterprise Plans | Phamda" },
      {
        name: "description",
        content:
          "Transparent Phamda pricing: monthly or annual billing, Standard for single pharmacies and Enterprise for multi-branch groups. Offline POS included in every plan.",
      },
      { property: "og:title", content: "Phamda Pricing" },
      {
        property: "og:description",
        content: "Simple monthly or annual plans for single pharmacies and multi-branch groups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

const PLANS = [
  {
    name: "Standard",
    tagline: "For single-location pharmacies getting off spreadsheets.",
    monthly: 49,
    annual: 39,
    highlight: false,
    features: [
      ["Offline-first POS", true],
      ["Global catalog validation", true],
      ["Batch & expiry tracking", true],
      ["Owner / admin / staff roles", true],
      ["Up to 8 staff accounts", true],
      ["Standard reports", true],
      ["Multi-branch tenants", false],
      ["Priority onboarding & migration", false],
    ] as [string, boolean][],
  },
  {
    name: "Enterprise",
    tagline: "For pharmacy groups running multiple branches and stations.",
    monthly: 129,
    annual: 99,
    highlight: true,
    features: [
      ["Offline-first POS", true],
      ["Global catalog validation", true],
      ["Batch & expiry tracking", true],
      ["Owner / admin / staff roles", true],
      ["Unlimited staff accounts", true],
      ["Advanced financial reporting", true],
      ["Multi-branch tenants", true],
      ["Priority onboarding & migration", true],
    ] as [string, boolean][],
  },
];

const FAQS = [
  {
    q: "How does multi-tenant setup work?",
    a: "Each pharmacy is its own tenant with isolated data protected by row-level security. Groups on Enterprise can register additional branches from the same owner account, each with its own staff, stock and reports.",
  },
  {
    q: "What exactly still works offline?",
    a: "The full point of sale: catalog browsing, stock levels, batch selection, pricing and checkout all read and write to local storage. Sales queue in a durable outbox and sync automatically when you reconnect.",
  },
  {
    q: "What requires an internet connection?",
    a: "Only adding new stock. Owners must search the verified cloud product catalog when creating a batch, which guarantees no invented or duplicated items enter your inventory.",
  },
  {
    q: "Can we change plans or cancel later?",
    a: "Yes. Switch between monthly and annual billing or move up to Enterprise at any time — your data, roles and history carry over untouched.",
  },
];

function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <MarketingLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:py-20">
          <span className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
            Pricing
          </span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Straightforward plans, per pharmacy
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Every plan includes the offline POS, catalog validation and role controls. Pick the
            scale you need.
          </p>

          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
            {[
              { id: false, label: "Monthly" },
              { id: true, label: "Annual · save 20%" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAnnual(opt.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  annual === opt.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative rounded-2xl border bg-surface p-7 shadow-elev-sm",
                plan.highlight ? "border-primary shadow-elev-md" : "border-border",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Most popular
                </span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>
              <div className="mt-6 flex items-end gap-1.5">
                <span className="font-mono-data text-4xl font-bold">
                  ${annual ? plan.annual : plan.monthly}
                </span>
                <span className="pb-1.5 text-sm text-muted-foreground">/ month per pharmacy</span>
              </div>
              <p className="mt-1 text-xs text-subtle-foreground">
                {annual ? "Billed annually" : "Billed monthly, cancel anytime"}
              </p>

              <Link
                to="/contact"
                className={cn(
                  "mt-6 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors",
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border-strong bg-surface hover:bg-surface-low",
                )}
              >
                Start with {plan.name}
              </Link>

              <ul className="mt-7 space-y-3 border-t border-border pt-6">
                {plan.features.map(([label, included]) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    {included ? (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Minus className="h-4 w-4 shrink-0 text-subtle-foreground" />
                    )}
                    <span className={included ? "" : "text-subtle-foreground line-through"}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-3xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-border bg-background p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Still deciding?{" "}
            <Link to="/contact" className="font-semibold text-primary hover:underline">
              Talk to our team
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
