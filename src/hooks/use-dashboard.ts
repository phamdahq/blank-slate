import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import * as dashboardService from "@/services/dashboardService";
import type {
  CustomRange,
  DashboardData,
  DashboardRange,
} from "@/services/dashboardService";
import { settingsRepo } from "@/db/pharmacy-config";

/**
 * Live dashboard metrics for a pharmacy and date range. Recomputes on any
 * local write (sale, expense, batch) and on any realtime pull from Supabase.
 */
export function useDashboard(
  pharmacyId: string | null | undefined,
  range: DashboardRange,
  custom?: CustomRange | null,
): DashboardData {
  useEffect(() => {
    if (pharmacyId) void settingsRepo.refresh(pharmacyId);
  }, [pharmacyId]);

  const fallback = dashboardService.loadEmpty(range, new Date(), custom);

  return (
    useLiveQuery(
      () => dashboardService.loadDashboard(pharmacyId, range, new Date(), custom),
      [pharmacyId, range, custom?.from, custom?.to],
      fallback,
    ) ?? fallback
  );
}
