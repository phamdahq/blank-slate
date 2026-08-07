import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCard, AdminPagination, AdminTabs } from "@/components/admin/admin-primitives";
import { PayoutsTable } from "@/components/admin/payouts-table";
import {
  approvePayout,
  listAllPayoutsForAdmin,
  rejectPayout,
  setPayoutStatus,
  type AdminPayoutRow,
} from "@/services/admin/payoutService";

export const Route = createFileRoute("/admin/payout")({
  head: () => ({
    meta: [
      { title: "Payouts · Phamda Master Console" },
      {
        name: "description",
        content: "Review, approve, and reject pharmacy subscription payouts across the platform.",
      },
      { property: "og:title", content: "Payouts · Phamda Master Console" },
      {
        property: "og:description",
        content: "Review, approve, and reject pharmacy subscription payouts across the platform.",
      },
    ],
  }),
  component: PayoutsRoute,
});

type Tab = "all" | "pending" | "verified" | "rejected";

function PayoutsRoute() {
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listAllPayoutsForAdmin()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e: unknown) => toast.error((e as Error).message ?? "Could not load payouts"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.pharmacy_name.toLowerCase().includes(q) ||
        r.transaction_reference.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const counts = useMemo(
    () => ({
      all: searched.length,
      pending: searched.filter((r) => r.status === "pending").length,
      verified: searched.filter((r) => r.status === "verified").length,
      rejected: searched.filter((r) => r.status === "rejected").length,
    }),
    [searched],
  );

  const filtered = useMemo(
    () => (tab === "all" ? searched : searched.filter((r) => r.status === tab)),
    [searched, tab],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = page > pageCount ? 1 : page;
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  async function update(row: AdminPayoutRow, next: "verified" | "rejected" | "pending") {
    setBusyId(row.id);
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      if (next === "verified") await approvePayout(row.id);
      else if (next === "rejected") await rejectPayout(row.id);
      else await setPayoutStatus(row.id, "pending");
      toast.success(
        next === "verified"
          ? `Approved ${row.transaction_reference}`
          : next === "rejected"
            ? `Rejected ${row.transaction_reference}`
            : `Reopened ${row.transaction_reference}`,
      );
    } catch (e) {
      setRows(prev);
      toast.error((e as Error).message ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="Phamda Master Console"
      searchPlaceholder="Search payout ID or pharmacy…"
      search={search}
      onSearchChange={(v) => {
        setSearch(v);
        setPage(1);
      }}
    >
      <AdminTabs<Tab>
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={[
          { value: "all", label: "All", count: counts.all },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "verified", label: "Approved", count: counts.verified },
          { value: "rejected", label: "Rejected", count: counts.rejected },
        ]}
      />

      <AdminCard className="mt-5 overflow-hidden">
        {loading ? (
          <div className="grid min-h-[240px] place-items-center text-sm text-muted-foreground">
            Loading payouts…
          </div>
        ) : (
          <>
            <PayoutsTable
              rows={visible}
              busyId={busyId}
              onApprove={(r) => void update(r, "verified")}
              onReject={(r) => void update(r, "rejected")}
              onReevaluate={(r) => void update(r, "pending")}
            />
            <AdminPagination
              page={current}
              pageCount={pageCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </>
        )}
      </AdminCard>
    </AdminShell>
  );
}
