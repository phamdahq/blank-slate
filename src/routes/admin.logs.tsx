import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: "Logs · Phamda Master Console" },
      { name: "description", content: "Audit trail of platform administrator activity." },
      { property: "og:title", content: "Logs · Phamda Master Console" },
      { property: "og:description", content: "Audit trail of platform administrator activity." },
    ],
  }),
  component: () => (
    <AdminShell>
      <AdminEmptySection title="Logs" note="Audit logs are coming soon." />
    </AdminShell>
  ),
});
