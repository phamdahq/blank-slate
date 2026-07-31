import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Platform settings · Phamda Master Console" },
      { name: "description", content: "Configure platform pricing, payment accounts and limits." },
      { property: "og:title", content: "Platform settings · Phamda Master Console" },
      {
        property: "og:description",
        content: "Configure platform pricing, payment accounts and limits.",
      },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Settings" note="Platform configuration is coming soon." />
    </AdminShell>
  ),
});
