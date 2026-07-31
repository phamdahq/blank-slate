import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/team")({
  head: () => ({
    meta: [
      { title: "Team · Phamda Master Console" },
      { name: "description", content: "Manage Phamda platform administrators and auditors." },
      { property: "og:title", content: "Team · Phamda Master Console" },
      { property: "og:description", content: "Manage Phamda platform administrators and auditors." },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Team" note="Platform team management is coming soon." />
    </AdminShell>
  ),
});
