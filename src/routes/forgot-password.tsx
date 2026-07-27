import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, Pill } from "lucide-react";
import { supabase } from "@/db/supabase";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password · Phamda" },
      {
        name: "description",
        content: "Reset your Phamda password — we'll email you a secure reset link.",
      },
      { property: "og:title", content: "Forgot password · Phamda" },
      {
        property: "og:description",
        content: "Reset your Phamda password — we'll email you a secure reset link.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = EMAIL_RE.test(email.trim());
  const showInvalid = touched && email.length > 0 && !valid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setTouched(true);
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Pill className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-primary">Phamda</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-elev-sm sm:p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for{" "}
                <span className="font-semibold text-foreground">{email.trim()}</span>, we've sent
                a link to reset your password. The link expires in 60 minutes.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-5 text-sm font-semibold text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Forgot password?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Email address
                  </span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                    <input
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)}
                      aria-invalid={showInvalid}
                      aria-describedby={showInvalid ? "email-error" : undefined}
                      placeholder="you@pharmacy.com"
                      className={
                        "h-11 w-full rounded-md border bg-surface pl-10 pr-3 text-sm outline-none focus:ring-2 " +
                        (showInvalid
                          ? "border-danger focus:border-danger focus:ring-danger/20"
                          : "border-border focus:border-primary focus:ring-primary/15")
                      }
                    />
                  </div>
                  {showInvalid && (
                    <span id="email-error" className="mt-1.5 block text-xs text-danger">
                      Enter a valid email address.
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={loading || !valid}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {loading ? "Sending reset link…" : "Send reset link"}
                </button>

                {error && (
                  <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
                    {error}
                  </p>
                )}
              </form>
            </>
          )}

          <div className="mt-6 border-t border-border pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
