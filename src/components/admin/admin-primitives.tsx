import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tab strip used across admin list views. */
export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
            value === t.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined ? ` (${t.count})` : ""}
        </button>
      ))}
    </div>
  );
}

/** Card wrapper for admin data tables. */
export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface shadow-elev-sm", className)}>
      {children}
    </div>
  );
}

/** Simple placeholder body for admin areas that aren't built yet. */
export function AdminEmptySection({ title, note }: { title: string; note?: string }) {
  return (
    <AdminCard className="grid min-h-[320px] place-items-center p-10 text-center">
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {note ?? "This section is coming soon."}
        </p>
      </div>
    </AdminCard>
  );
}

/** Numbered pagination + page-size control. */
export function AdminPagination({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const pages: Array<number | "…"> = [];
  const last = Math.max(pageCount, 1);
  for (let i = 1; i <= last; i++) {
    if (i <= 3 || i === last) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
      <label className="flex items-center gap-2 font-mono-data text-sm text-foreground">
        Items per page:
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        >
          {[10, 25, 50].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "h-9 min-w-9 rounded-md border px-2 font-mono-data text-sm font-semibold",
                p === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-low",
              )}
            >
              {p}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
