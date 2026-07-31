import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEmptySection } from "@/components/admin/admin-primitives";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [
      { title: "Admin profile · Phamda Master Console" },
      { name: "description", content: "Your Phamda platform administrator account details." },
      { property: "og:title", content: "Admin profile · Phamda Master Console" },
      { property: "og:description", content: "Your Phamda platform administrator account details." },
    ],
  }),
  component: () => (
    <AdminShell title="Phamda Master Console">
      <AdminEmptySection title="Profile" note="Admin account settings are coming soon." />
    </AdminShell>
  ),
});
