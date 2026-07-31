import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Support · Phamda Master Console" },
      { name: "description", content: "Support requests from pharmacies on the Phamda platform." },
      { property: "og:title", content: "Support · Phamda Master Console" },
      {
        property: "og:description",
        content: "Support requests from pharmacies on the Phamda platform.",
      },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Support" note="Support inbox is coming soon." />
    </AdminShell>
  ),
});
