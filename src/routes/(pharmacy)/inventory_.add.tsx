import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Search, WifiOff } from "lucide-react";
import { AppShellWithSlot } from "@/components/app-shell";
import { RequireRole } from "@/components/require-role";
import { OfflineError } from "@/db/catalog-remote";
import { searchAvailableGlobalProducts } from "@/services/inventory/catalogService";
import { useSession } from "@/hooks/use-session";
import type { Product } from "@/db/dexie";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory_/add")({
  head: () => ({
    meta: [
      { title: "Add Stock — Choose Product · PharmaCore" },
      {
        name: "description",
        content:
          "Search the global catalog and pick a product to add stock to your inventory.",
      },
    ],
  }),
  component: AddStockPicker,
});

function AddStockPicker() {
  return (
    <RequireRole roles={["owner"]}>
      <AddStockPickerView />
    </RequireRole>
  );
}

function AddStockPickerView() {
  const online = useOnline();
  const { pharmacyId } = useSession();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Products come from the upstream Supabase catalog only, minus items
  // already stocked by this pharmacy.
  useEffect(() => {
    if (!pharmacyId) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      void searchAvailableGlobalProducts(pharmacyId, q)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setResults([]);
          setError(
            err instanceof OfflineError
              ? "You are offline. Connect to the internet to search the global product catalog."
              : err instanceof Error
                ? err.message
                : "Search failed.",
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, online, pharmacyId]);

  return (
    <AppShellWithSlot hideBell>
      <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>

        <div className="mt-3">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]">
            Add Stock
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a product from the global catalog. You'll add batch and pricing details next.
          </p>
        </div>

        {!online && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning-soft-foreground/20 bg-warning-soft px-3 py-2.5 text-xs text-warning-soft-foreground">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You are offline. Adding stock requires a connection so products can be
              verified against the global catalog.
            </span>
          </div>
        )}

        {/* Search */}
        <div className="mt-5 sm:mt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by brand or generic name…"
              className="h-14 w-full rounded-lg border border-border bg-surface pl-12 pr-4 text-[15px] outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        {/* Suggestions */}
        <section className="mt-6 rounded-lg border border-border bg-surface shadow-elev-sm">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <h2 className="font-mono-data text-[12px] font-bold uppercase tracking-wider text-primary">
              {q ? "Search results" : "Global catalog"}
            </h2>
            <span className="font-mono-data text-[11px] text-subtle-foreground">
              {loading ? "Searching…" : `${results.length} ${results.length === 1 ? "match" : "matches"}`}
            </span>
          </header>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono-data text-[11px] uppercase tracking-wider text-subtle-foreground">
                  <th className="px-5 py-3 font-semibold">Medication</th>
                  <th className="px-5 py-3 font-semibold">Generic</th>
                  <th className="px-5 py-3 font-semibold">Strength</th>
                  <th className="px-5 py-3 font-semibold">Form</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {results.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold">{m.name}</div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {m.generic_name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono-data">{m.strength ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex h-6 items-center rounded-full bg-surface-low px-2.5 font-mono-data text-[11px] font-semibold text-muted-foreground">
                        {m.dosage_form ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to="/inventory/add/$productId"
                        params={{ productId: m.id }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Stock
                      </Link>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && !loading && <EmptyRow message={error} />}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-border sm:hidden">
            {results.map((m) => (
              <li key={m.id}>
                <Link
                  to="/inventory/add/$productId"
                  params={{ productId: m.id }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-low"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {m.name} {m.strength}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {m.generic_name ?? "—"} · {m.dosage_form ?? "—"}
                    </div>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                    <Plus className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
            {results.length === 0 && (
              <li className={cn("px-4 py-8 text-center text-sm text-muted-foreground")}>
                {error ?? `No products match "${q}".`}
              </li>
            )}
          </ul>
        </section>
      </div>
    </AppShellWithSlot>
  );
}

function EmptyRow({ message }: { message?: string | null }) {
  return (
    <tr>
      <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
        {message ?? "No products found. Try a different search term."}
      </td>
    </tr>
  );
}
