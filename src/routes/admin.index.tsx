import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard · Phamda Master Console" },
      { name: "description", content: "Platform-wide overview of the Phamda pharmacy network." },
      { property: "og:title", content: "Admin dashboard · Phamda Master Console" },
      {
        property: "og:description",
        content: "Platform-wide overview of the Phamda pharmacy network.",
      },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Dashboard" note="Platform metrics land here soon." />
    </AdminShell>
  ),
});
