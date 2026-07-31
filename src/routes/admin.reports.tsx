import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Platform reports · Phamda Master Console" },
      { name: "description", content: "Revenue and adoption reporting across all Phamda tenants." },
      { property: "og:title", content: "Platform reports · Phamda Master Console" },
      {
        property: "og:description",
        content: "Revenue and adoption reporting across all Phamda tenants.",
      },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Reports" note="Platform reporting is coming soon." />
    </AdminShell>
  ),
});
