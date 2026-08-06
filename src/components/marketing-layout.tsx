import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Pill, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type MarketingPath = "/" | "/features" | "/pricing" | "/contact";

const NAV: { to: MarketingPath; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
];

/**
 * Persistent public-site chrome: global header with active-route highlighting
 * and a shared footer. Wraps every marketing page (Home/Features/Pricing/Contact).
 */
export function MarketingLayout({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Pill className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-primary">Phamda</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-foreground hover:bg-surface-low"
            >
              Sign in
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Start free trial
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-md text-foreground hover:bg-surface-low md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-surface px-5 py-3 md:hidden">
            <nav className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium",
                    location.pathname === item.to
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border text-sm font-semibold"
              >
                Sign in
              </Link>
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 animate-[fade-in_.25s_ease-out]">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Pill className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-primary">Phamda</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Offline-first pharmacy management for multi-branch operators. Sell through outages,
              sync when you reconnect.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink to="/features">Features</FooterLink>
            <FooterLink to="/pricing">Pricing</FooterLink>
            <FooterLink to="/contact">Register a pharmacy</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink to="/contact">Contact sales</FooterLink>
            <FooterLink to="/contact">Support</FooterLink>
            <FooterLink to="/login">Sign in</FooterLink>
          </FooterCol>

          <FooterCol title="Contact">
            <li className="text-sm text-muted-foreground">phamdahub@gmail.com</li>
            <li className="text-sm text-muted-foreground">+251 965439882</li>
            <li className="text-sm text-muted-foreground">Addis Ababa</li>
            <li className="text-sm text-muted-foreground">Mon–Sun · 08:00–20:00 EAT</li>
          </FooterCol>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono-data uppercase tracking-wider">
              © {new Date().getFullYear()} Phamda Tech
            </span>
            <span>Built for pharmacies that can't afford downtime.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-mono-data text-[11px] font-bold uppercase tracking-wider text-foreground">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: MarketingPath | "/login"; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-sm text-muted-foreground hover:text-primary">
        {children}
      </Link>
    </li>
  );
}
