import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "../db/supabase";
import { Toaster } from "@/components/ui/sonner";
import { useSession } from "@/hooks/use-session";
import { PaymentGate } from "@/components/payment-gate";
import { pullAll, startRealtimeSync } from "@/services/sync/realtimeService";


const PUBLIC_ROUTES = new Set([
  "/",
  "/features",
  "/pricing",
  "/contact",
  "/login",
  "/forgot-password",
  "/reset-password",
]);


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#00478d" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "PharmaCore" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Boot the offline-first sync engine on the client only.
    let cancelled = false;
    let unsubEvents: (() => void) | undefined;
    void (async () => {
      const { startSyncEngine, subscribeSyncEvents } = await import("../db/sync");
      if (cancelled) return;
      startSyncEngine();
      unsubEvents = subscribeSyncEvents((e) => {
        if (e.kind === "sale-voided-insufficient-stock") {
          toast.error("Sale voided — out of stock", {
            description: `A queued sale of ${e.quantity} unit(s) was rejected by the server because the batch no longer has enough stock. Local inventory has been restored.`,
          });
        } else if (e.kind === "sale-voided-other") {
          toast.error("Sale voided", { description: e.message });
        }
      });
    })();
    return () => {
      cancelled = true;
      unsubEvents?.();
    };
  }, []);




  // Client-side auth guard: redirect unauthenticated users to /login
  // for any non-public route. Runs after hydration to avoid SSR flashes.
  // useEffect(() => {
  //   let unsubAuth: (() => void) | undefined;
  //   let unsubRouter: (() => void) | undefined;

  //   const check = (isAuthed: boolean) => {
  //     const path = window.location.pathname;
  //     const isPublic = PUBLIC_ROUTES.has(path);
  //     if (!isAuthed && !isPublic) {
  //       router.navigate({ to: "/login" });
  //     } else if (isAuthed && isPublic) {
  //       router.navigate({ to: "/" });
  //     }
  //   };

  //   supabase.auth.getSession().then(({ data }) => check(!!data.session));
  //   const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(!!s));
  //   unsubAuth = () => sub.subscription.unsubscribe();
  //   unsubRouter = router.subscribe("onResolved", () => {
  //     supabase.auth.getSession().then(({ data }) => check(!!data.session));
  //   });

  //   return () => {
  //     unsubAuth?.();
  //     unsubRouter?.();
  //   };
  // }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBootstrap />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <PaymentGate />
      <Toaster />
    </QueryClientProvider>
  );
}

/**
 * Kicks off the startup pull + Supabase realtime subscriptions for the
 * current pharmacy. Re-runs whenever the active pharmacy changes.
 */
function RealtimeBootstrap() {
  const { pharmacyId } = useSession();
  useEffect(() => {
    if (!pharmacyId) return;
    void pullAll(pharmacyId);
    const stop = startRealtimeSync(pharmacyId);
    const onOnline = () => void pullAll(pharmacyId);
    window.addEventListener("online", onOnline);
    return () => {
      stop();
      window.removeEventListener("online", onOnline);
    };
  }, [pharmacyId]);
  return null;
}

