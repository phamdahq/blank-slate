import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Boxes,
  ClipboardList,
  FileBarChart2,
  LayoutGrid,
  Menu,
  Receipt,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/supplier/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/supplier/incoming-orders", label: "Incoming Orders", icon: ClipboardList },
  { to: "/supplier/inventory", label: "Inventory", icon: Boxes },
  { to: "/supplier/sales-history", label: "Sales History", icon: Receipt },
  { to: "/supplier/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/supplier/profile", label: "Profile", icon: User },
] as const;

export interface SupplierShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Shared chrome (sidebar + header) for every /supplier/* screen. */
export function SupplierShell({ title, subtitle, actions, children }: SupplierShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-surface-low">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-6 py-6">
          <Link to="/supplier/dashboard" className="text-lg font-extrabold text-primary">
            Phamda Supplier
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Wholesale portal</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-surface-low",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
          Nile Medical Distributors PLC
        </div>
      </aside>

      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[72px] flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded-md border border-border lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
