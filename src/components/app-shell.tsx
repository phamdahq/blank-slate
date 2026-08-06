import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  BarChart3,
  Bell,
  Pill,
  User,
  ClipboardList,
  Receipt,
  Truck,
  Store,

} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SyncStatus } from "@/components/sync-status";
import { useSession } from "@/hooks/use-session";
import { useOrdersEnabled } from "@/hooks/use-orders";
import type { Role } from "@/db/session";


type NavItem = {
  to:
    | "/dashboard"
    | "/pos"
    | "/orders"
    | "/sales"
    | "/purchase-orders"
    | "/marketplace"
    | "/inventory"
    | "/reports"
    | "/profile";
  label: string;
  icon: typeof LayoutDashboard;
  match: string[];
  /** Roles allowed to see this destination. Omitted = every role. */
  roles?: Role[];
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  { to: "/pos", label: "POS", icon: ScanLine, match: ["/pos"] },
  { to: "/orders", label: "Orders", icon: ClipboardList, match: ["/orders"] },
  { to: "/sales", label: "Sales", icon: Receipt, match: ["/sales"] },
  {
    to: "/purchase-orders",
    label: "Purchases",
    icon: Truck,
    match: ["/purchase-orders"],
    roles: ["owner", "pharmacist"],
  },
  {
    to: "/marketplace",
    label: "Market",
    icon: Store,
    match: ["/marketplace"],
    roles: ["owner", "pharmacist"],
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: Package,
    match: ["/inventory"],
    roles: ["owner"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    match: ["/reports"],
    roles: ["owner", "pharmacist"],
  },
  { to: "/profile", label: "Profile", icon: User, match: ["/profile"] },
];


export function AppShell({
  children,
  topBarSlot,
  hideBell,
}: {
  children: ReactNode;
  topBarSlot?: ReactNode;
  hideBell?: boolean;
}) {
  return <AppShellInner topBarSlot={topBarSlot} hideBell={hideBell}>{children}</AppShellInner>;
}

function AppShellInner({
  children,
  topBarSlot,
  hideBell,
}: {
  children: ReactNode;
  topBarSlot?: ReactNode;
  hideBell?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopSidebar />
      <div className="md:pl-[72px] xl:pl-[260px]">
        <TopBar slot={topBarSlot} hideBell={hideBell} />
        <main className="pb-24 md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export function AppShellWithSlot({
  children,
  topBarSlot,
  hideBell,
}: {
  children: ReactNode;
  topBarSlot?: ReactNode;
  hideBell?: boolean;
}) {
  return <AppShellInner topBarSlot={topBarSlot} hideBell={hideBell}>{children}</AppShellInner>;
}

/** Nav filtered by the signed-in user's role. */
function useNavItems(): NavItem[] {
  const { role } = useSession();
  const ordersEnabled = useOrdersEnabled();
  return navItems.filter(
    (i) =>
      (i.to !== "/orders" || ordersEnabled) &&
      (!i.roles || (!!role && i.roles.includes(role))),
  );
}

function initialsOf(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "–";
}

function DesktopSidebar() {
  const { location } = useRouterState();
  const items = useNavItems();
  const { profile, role } = useSession();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col border-r border-sidebar-border bg-sidebar md:flex xl:w-[260px]">
      <div className="flex items-center gap-2.5 px-4 py-6 xl:px-6">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Pill className="h-5 w-5" />
        </div>
        <div className="hidden min-w-0 xl:block">
          <div className="text-[17px] font-bold leading-tight tracking-tight text-primary">
            Phamda
          </div>
          <div className="font-mono-data text-[11px] font-medium text-subtle-foreground">
            Station 01 · Active
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2 xl:px-3">
        {items.map((item) => {
          const active =
            item.match.includes(location.pathname) || location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              title={item.label}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                "justify-center xl:justify-start",
                active
                  ? "bg-sidebar-active text-sidebar-active-foreground font-semibold"
                  : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden truncate xl:inline">{item.label}</span>
              {active && (
                <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-sidebar-active-foreground xl:block" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 xl:px-4 xl:py-4">
        <Link to="/profile" className="flex items-center gap-3 rounded-md p-1 hover:bg-surface-low">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary-soft text-secondary-soft-foreground font-semibold">
            {initialsOf(profile?.first_name, profile?.last_name)}
          </div>
          <div className="hidden min-w-0 flex-1 xl:block">
            <div className="truncate text-sm font-semibold">
              {profile ? `${profile.first_name} ${profile.last_name}` : "Signed out"}
            </div>
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-subtle-foreground">
              {role ?? "—"}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

function TopBar({ slot, hideBell }: { slot?: ReactNode; hideBell?: boolean }) {
  const { profile } = useSession();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6 xl:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <Pill className="h-4 w-4" />
        </div>
        <span className="text-base font-bold text-primary">Phamda</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <SyncStatus />
        {slot}
        {!hideBell && (

          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-low hover:text-foreground"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
          </button>
        )}
        <Link
          to="/profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-surface-mid text-sm font-semibold text-primary-soft-foreground hover:bg-primary-soft"
          aria-label="Profile"
        >
          {initialsOf(profile?.first_name, profile?.last_name)}
        </Link>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const { location } = useRouterState();
  const items = useNavItems();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface md:hidden">
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.match.includes(location.pathname);
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-sidebar-active" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-sidebar-active text-sidebar-active-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
