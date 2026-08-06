import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/supplier/")({
  component: () => <Navigate to="/supplier/dashboard" replace />,
});
