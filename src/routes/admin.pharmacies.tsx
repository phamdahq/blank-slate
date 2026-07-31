import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/pharmacies")({
  head: () => ({
    meta: [
      { title: "Pharmacies · Phamda Master Console" },
      { name: "description", content: "Manage every pharmacy tenant on the Phamda platform." },
      { property: "og:title", content: "Pharmacies · Phamda Master Console" },
      {
        property: "og:description",
        content: "Manage every pharmacy tenant on the Phamda platform.",
      },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Pharmacies" note="Tenant management is coming soon." />
    </AdminShell>
  ),
});
