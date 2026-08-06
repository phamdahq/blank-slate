import { useQuery } from "@tanstack/react-query";
import * as salesHistoryService from "@/services/pos/salesHistoryService";
import type { SalesHistoryFilters } from "@/services/pos/salesHistoryService";

/** Paged sales ledger with server-side filters. */
export function useSalesHistory(filters: SalesHistoryFilters | null) {
  return useQuery({
    queryKey: [
      "sales-history",
      filters?.pharmacyId,
      filters?.from,
      filters?.to,
      filters?.soldBy,
      filters?.search,
      filters?.page,
      filters?.pageSize,
    ],
    queryFn: () => salesHistoryService.fetchSalesHistory(filters!),
    enabled: !!filters?.pharmacyId,
    placeholderData: (prev) => prev,
  });
}

export function useCashiers(pharmacyId: string | null | undefined) {
  return useQuery({
    queryKey: ["cashiers", pharmacyId],
    queryFn: () => salesHistoryService.fetchCashiers(pharmacyId!),
    enabled: !!pharmacyId,
  });
}

export function useTransactionLines(
  pharmacyId: string | null | undefined,
  transactionId: string | null,
) {
  return useQuery({
    queryKey: ["transaction-lines", pharmacyId, transactionId],
    queryFn: () =>
      salesHistoryService.fetchTransactionLines(pharmacyId!, transactionId!),
    enabled: !!pharmacyId && !!transactionId,
  });
}
