import { useLiveQuery } from "dexie-react-hooks";
import * as reportsService from "@/services/reportsService";
import type {
  CustomRange,
  ProductVelocity,
  ReportRange,
  SalesIntelligenceData,
} from "@/services/reportsService";

/** Live Sales Intelligence metrics for a pharmacy and report date range. */
export function useSalesIntelligence(
  pharmacyId: string | null | undefined,
  range: ReportRange,
  custom?: CustomRange | null,
): SalesIntelligenceData {
  const fallback = reportsService.emptySalesIntelligence(range, new Date(), custom);
  return (
    useLiveQuery(
      () => reportsService.loadSalesIntelligence(pharmacyId, range, new Date(), custom),
      [pharmacyId, range, custom?.from, custom?.to],
      fallback,
    ) ?? fallback
  );
}

/** Live per-product sales velocity within the selected range. */
export function useVelocity(
  pharmacyId: string | null | undefined,
  range: ReportRange,
  custom?: CustomRange | null,
): Map<string, ProductVelocity> {
  const empty = new Map<string, ProductVelocity>();
  return (
    useLiveQuery(
      () => reportsService.loadVelocity(pharmacyId, range, new Date(), custom),
      [pharmacyId, range, custom?.from, custom?.to],
      empty,
    ) ?? empty
  );
}
