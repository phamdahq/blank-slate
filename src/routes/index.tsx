import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CloudOff,
  Database,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Phamda — Offline-First Pharmacy Management System" },
      {
        name: "description",
        content:
          "Phamda keeps your pharmacy selling during internet outages: offline POS, validated global catalog, batch tracking and owner/staff role controls.",
      },
      { property: "og:title", content: "Phamda — Never Stop Selling" },
      {
        property: "og:description",
        content:
          "Offline-first pharmacy POS and inventory with Supabase-validated catalog and strict role-based access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(255,255,255,.28), transparent 45%), radial-gradient(circle at 85% 85%, rgba(255,255,255,.18), transparent 45%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono-data text-[11px] font-semibold uppercase tracking-wider">
              <CloudOff className="h-3.5 w-3.5" /> Works with zero connectivity
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Never Stop Selling.
              <span className="block text-primary-foreground/80">
                The Offline-First Pharmacy Management System.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
              Phamda runs your point of sale, batch inventory and reporting from local storage
              first — then syncs safely to the cloud the moment you're back online.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-surface px-6 text-sm font-semibold text-primary transition-colors hover:bg-surface-low"
              >
                Register your pharmacy <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-sm font-semibold text-primary-foreground hover:bg-white/10"
              >
                Explore the platform
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[
                ["100%", "Uptime at the counter"],
                ["<50ms", "Local catalog lookups"],
                ["3", "Role tiers out of the box"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-mono-data text-2xl font-bold">{v}</dt>
                  <dd className="mt-1 text-xs text-primary-foreground/70">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <span className="font-mono-data text-xs uppercase tracking-wider">
                  Sync status
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> Offline · queued
                </span>
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  "Sale #10482 · 3 items · saved locally",
                  "Batch AMX-0921 · 120 units received",
                  "Sale #10483 · 1 item · saved locally",
                ].map((row) => (
                  <li
                    key={row}
                    className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2.5"
                  >
                    <span className="truncate">{row}</span>
                    <CheckCircle2 className="ml-3 h-4 w-4 shrink-0" />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-primary-foreground/70">
                Everything above will push to the cloud automatically when the connection returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Built for the realities of pharmacy retail
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Three pillars keep your counter running, your stock accurate and your data safe.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Offline POS",
              body: "Every sale is written to local IndexedDB first, so checkout never waits on the network — and never loses a transaction.",
            },
            {
              icon: Database,
              title: "Global Catalog Validation",
              body: "Stock is only added from the verified cloud product catalog. No invented SKUs, no duplicate spellings, no dirty data.",
            },
            {
              icon: ShieldCheck,
              title: "Owner / Staff RBAC",
              body: "Owners manage inventory, pricing and reports. Staff get a focused POS. Permissions hold even while offline.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-xl border border-border bg-surface p-6 shadow-elev-sm transition-shadow hover:shadow-elev-md"
            >
              <span className="grid h-11 w-11 place-items-center rounded-md bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="px-5 pb-20">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface-low p-8 sm:p-12">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to make downtime irrelevant?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Compare plans, or talk to our team about migrating your existing inventory and
                training staff — usually done in under a day.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                to="/pricing"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                See pricing <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border-strong bg-surface px-6 text-sm font-semibold hover:bg-surface-mid"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
