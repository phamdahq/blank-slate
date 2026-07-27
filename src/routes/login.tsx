import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Pill, ShieldCheck } from "lucide-react";
import { supabase } from "@/db/supabase";
import { resolvePostLoginTarget } from "@/db/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Phamda" },
      {
        name: "description",
        content:
          "Sign in to Phamda — the operating system for modern pharmacy operations.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Role- and tenant-aware redirect: platform admins / owners go to tenant
    // setup, associated staff go straight to their pharmacy workspace.
    const userId = data.user?.id;
    let target: Awaited<ReturnType<typeof resolvePostLoginTarget>> | null = null;
    try {
      target = userId ? await resolvePostLoginTarget(userId) : null;
    } catch {
      target = null;
    }
    setLoading(false);

    if (!target || target.kind === "error") {
      await supabase.auth.signOut();
      setError(
        target?.kind === "error"
          ? target.message
          : "We couldn't verify your access right now. Please try again.",
      );
      return;
    }

    router.navigate({ to: target.to });
  }


  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,.25), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,.2), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-white/15 backdrop-blur">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Phamda</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            The Operating System for Modern Pharmacy.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Real-time inventory, batch-aware POS, and financial intelligence — one
            login, every station.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/90">
            <Feat>Batch & expiry tracking on every SKU</Feat>
            <Feat>Multi-station cash & VAT reconciliation</Feat>
            <Feat>Role-based access for pharmacists & cashiers</Feat>
          </ul>
        </div>

        <div className="relative font-mono-data text-xs uppercase tracking-wider text-primary-foreground/60">
          © {new Date().getFullYear()} Phamda Tech
        </div>
      </aside>

      {/* Right form panel */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Pill className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-primary">Phamda</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your Phamda workspace.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email address
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@pharmacy.com"
                  className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                Password
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Forgot Password?
                </Link>
              </span>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                <input
                  required
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            {error && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Phamda?{" "}
            <Link to="/contact" className="font-semibold text-primary hover:underline">
              Talk to our team
            </Link>
          </p>

        </div>
      </section>
    </div>
  );
}

function Feat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
