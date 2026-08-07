import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/supplier/rout")({
  ssr: false,
  component: () => <Outlet />,
});
