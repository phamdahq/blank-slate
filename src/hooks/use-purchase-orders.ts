import { useQuery } from "@tanstack/react-query";
import * as purchaseOrderService from "@/services/purchasing/purchaseOrderService";
import type { PurchaseOrderStatus } from "@/services/purchasing/purchaseOrderService";

export function usePurchaseOrders(
  pharmacyId: string | null | undefined,
  status: PurchaseOrderStatus | "all",
  search: string,
) {
  return useQuery({
    queryKey: ["purchase-orders", pharmacyId, status, search],
    queryFn: () => purchaseOrderService.fetchPurchaseOrders(pharmacyId!, status, search),
    enabled: !!pharmacyId,
    placeholderData: (prev) => prev,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => purchaseOrderService.fetchSuppliers(),
  });
}

export function useOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ["purchase-order-items", orderId],
    queryFn: () => purchaseOrderService.fetchOrderItems(orderId!),
    enabled: !!orderId,
  });
}
