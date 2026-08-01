import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  FileBarChart2,
  LayoutGrid,
  LifeBuoy,
  Menu,
  Package,
  Search,
  Settings,
  Terminal,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/admin/pharmacies", label: "Pharmacies", icon: Building2 },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/payout", label: "Payouts", icon: Wallet },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/team", label: "Team", icon: Users },
  { to: "/admin/profile", label: "Profile", icon: User },
] as const;

const FOOTER_NAV = [
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/logs", label: "Logs", icon: Terminal },
] as const;

export interface AdminShellProps {
  title?: string;
  searchPlaceholder?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  children: ReactNode;
}


/** Shared chrome for every /admin/* screen. */
export function AdminShell({
  searchPlaceholder = "Search…",
  search,
  onSearchChange,
  children,
}: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });


  return (
    <div className="flex min-h-screen bg-surface-low">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-6 py-6">
          <Link to="/admin" className="text-lg font-extrabold text-primary">
            Phamda Admin
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <AdminNavLink key={item.to} {...item} pathname={pathname} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
        <div className="space-y-1 border-t border-border px-3 py-4">
          {FOOTER_NAV.map((item) => (
            <AdminNavLink key={item.to} {...item} pathname={pathname} onNavigate={() => setOpen(false)} />
          ))}
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
        <header className="flex h-[72px] items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded-md border border-border lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          {onSearchChange && (
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-lg bg-surface-low pl-10 pr-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-4">
            <button className="relative grid h-9 w-9 place-items-center rounded-md" aria-label="Notifications">
              <Bell className="h-5 w-5 text-foreground" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
            </button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Link
              to="/admin/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-low"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary">
                <User className="h-4 w-4" />
              </span>
              <span className="hidden sm:block">Profile</span>
            </Link>
          </div>

        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminNavLink({
  to,
  label,
  icon: Icon,
  exact,
  pathname,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-surface-low",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
