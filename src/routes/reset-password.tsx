import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Lock, Pill } from "lucide-react";
import { supabase } from "@/db/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password · Phamda" },
      { name: "description", content: "Choose a new password for your Phamda account." },
      { property: "og:title", content: "Set a new password · Phamda" },
      {
        property: "og:description",
        content: "Choose a new password for your Phamda account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = !tooShort && confirm !== password;
  const valid = password.length >= 8 && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.navigate({ to: "/login" }), 1200);
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Set a new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose a strong password of at least 8 characters.
          </p>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              show={show}
              onToggle={() => setShow((s) => !s)}
              error={tooShort ? "Use at least 8 characters." : null}
            />
            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              show={show}
              onToggle={() => setShow((s) => !s)}
              error={mismatch ? "Passwords don't match." : null}
            />

            <button
              type="submit"
              disabled={loading || !valid || done}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {done ? "Password updated" : loading ? "Updating…" : "Update password"}
            </button>

            {error && (
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={
            "h-11 w-full rounded-md border bg-surface pl-10 pr-11 text-sm outline-none focus:ring-2 " +
            (error
              ? "border-danger focus:border-danger focus:ring-danger/20"
              : "border-border focus:border-primary focus:ring-primary/15")
          }
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface-low"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
}
