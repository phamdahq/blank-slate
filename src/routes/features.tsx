import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CloudOff,
  Database,
  Layers,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Offline POS, Batch Inventory & RBAC | Phamda" },
      {
        name: "description",
        content:
          "Deep dive into Phamda: local-first POS, cloud-validated product catalog, batch and expiry tracking, granular role permissions and multi-tenant scale.",
      },
      { property: "og:title", content: "Phamda Features" },
      {
        property: "og:description",
        content:
          "Local-first POS, validated catalog, batch tracking, RBAC and multi-tenant architecture.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeaturesPage,
});

const CAPABILITIES = [
  {
    icon: CloudOff,
    kicker: "01 · Resilience",
    title: "Unstoppable Offline POS",
    body: "The register reads and writes to a local IndexedDB store, so scanning, pricing and receipting keep working through outages, load-shedding and dead links.",
    points: [
      "Sales committed locally in milliseconds",
      "Durable outbox queue replays on reconnect",
      "Conflict-safe stock decrements per batch",
    ],
  },
  {
    icon: Database,
    kicker: "02 · Data quality",
    title: "Global Catalog & Inventory Batches",
    body: "Stock can only enter from the verified cloud catalog. Owners search upstream products, then record batch number, quantity, cost, price and expiry.",
    points: [
      "No free-text SKUs — every item validates upstream",
      "Batch-level expiry and cost tracking",
      "Selected products cached locally for fast reuse",
    ],
  },
  {
    icon: ShieldCheck,
    kicker: "03 · Control",
    title: "Granular Role-Based Access",
    body: "Owners run inventory, pricing and financial reporting. Staff see a focused selling surface. Roles are mirrored locally so gating survives offline sessions.",
    points: [
      "Owner: inventory, batches, reports, settings",
      "Admin: reporting and oversight",
      "Staff: POS only — no cost or margin exposure",
    ],
  },
  {
    icon: Building2,
    kicker: "04 · Scale",
    title: "Multi-Tenant Scalability",
    body: "Every record is scoped to a pharmacy tenant and protected by row-level security, so groups can run many branches from one platform without data bleed.",
    points: [
      "Tenant-scoped records end to end",
      "Row-level security on every table",
      "Per-branch stations, staff and reporting",
    ],
  },
];

function FeaturesPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:py-20">
          <span className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
            Platform
          </span>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Everything a pharmacy needs, engineered offline-first
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Phamda pairs local speed with cloud correctness — a technical breakdown of how each
            layer works.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-14 px-5 py-16 sm:py-20">
        {CAPABILITIES.map(({ icon: Icon, kicker, title, body, points }, i) => (
          <article
            key={title}
            className={`grid items-center gap-8 lg:grid-cols-2 ${
              i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div>
              <span className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-primary">
                {kicker}
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
              <p className="mt-3 text-muted-foreground">{body}</p>
              <ul className="mt-5 space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface p-8 shadow-elev-sm">
              <span className="grid h-14 w-14 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="h-7 w-7" />
              </span>
              <div className="mt-6 space-y-3">
                {points.map((p, idx) => (
                  <div
                    key={p}
                    className="h-2 rounded-full bg-surface-low"
                    style={{ width: `${100 - idx * 18}%` }}
                  />
                ))}
              </div>
              <p className="mt-6 font-mono-data text-xs uppercase tracking-wider text-subtle-foreground">
                {title}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16 md:grid-cols-3">
          {[
            { icon: RefreshCw, t: "Background sync", d: "A durable outbox drains automatically the second connectivity returns." },
            { icon: Layers, t: "Batch intelligence", d: "FEFO-aware stock views surface expiring and dead stock before it costs you." },
            { icon: Users, t: "Team ready", d: "Invite staff, assign roles, and keep sensitive margins owner-only." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-background p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          See it running in your pharmacy
        </h2>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/pricing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            View pricing <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-12 items-center justify-center rounded-md border border-border-strong bg-surface px-6 text-sm font-semibold hover:bg-surface-mid"
          >
            Book a walkthrough
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
