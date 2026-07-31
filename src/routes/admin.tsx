import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequirePlatformOwner } from "@/components/require-platform-owner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RequirePlatformOwner>
      <Outlet />
    </RequirePlatformOwner>
  );
}
