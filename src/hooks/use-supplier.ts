import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as supplierService from "@/services/supplier/supplierService";
import * as ordersService from "@/services/supplier/supplierOrdersService";
import * as inventoryService from "@/services/supplier/supplierInventoryService";
import * as analyticsService from "@/services/supplier/supplierAnalyticsService";
import type { OrderStatus } from "@/lib/supplier-format";

/** Resolves the signed-in supplier tenant; every other query depends on it. */
export function useSupplierContext() {
  return useQuery({
    queryKey: ["supplier", "context"],
    queryFn: supplierService.fetchSupplierContext,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSupplierDashboard(supplierId: string | undefined) {
  return useQuery({
    queryKey: ["supplier", "dashboard", supplierId],
    queryFn: () => analyticsService.loadDashboard(supplierId!),
    enabled: !!supplierId,
  });
}

export function useIncomingOrders(
  supplierId: string | undefined,
  filters: ordersService.OrderFilters,
) {
  return useQuery({
    queryKey: ["supplier", "orders", supplierId, filters],
    queryFn: () => ordersService.fetchIncomingOrders(supplierId!, filters),
    enabled: !!supplierId,
    placeholderData: (prev) => prev,
  });
}

export function useOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ["supplier", "order-items", orderId],
    queryFn: () => ordersService.fetchOrderItems(orderId!),
    enabled: !!orderId,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateOrderStatus(id, status),
    onSuccess: (order) => {
      toast.success(`Order marked ${order.status}`);
      void qc.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSupplierStock(supplierId: string | undefined, search: string) {
  return useQuery({
    queryKey: ["supplier", "stock", supplierId, search],
    queryFn: () => inventoryService.fetchSupplierStock(supplierId!, search),
    enabled: !!supplierId,
    placeholderData: (prev) => prev,
  });
}

export function useCatalogSearch(term: string, enabled: boolean) {
  return useQuery({
    queryKey: ["supplier", "catalog", term],
    queryFn: () => inventoryService.searchCatalog(term),
    enabled,
  });
}

export function useAddBatch(supplierId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: inventoryService.NewSupplierBatch) =>
      inventoryService.addSupplierBatch(supplierId!, input),
    onSuccess: () => {
      toast.success("Product batch added to your stock");
      void qc.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBatchQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      inventoryService.updateBatchQuantity(id, quantity),
    onSuccess: () => {
      toast.success("Stock updated");
      void qc.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBatchPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      purchase_cost,
      selling_price,
    }: {
      id: string;
      purchase_cost: number;
      selling_price: number;
    }) => inventoryService.updateBatchPricing(id, purchase_cost, selling_price),
    onSuccess: () => {
      toast.success("Pricing updated");
      void qc.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteSupplierBatch(id),
    onSuccess: () => {
      toast.success("Batch removed");
      void qc.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSalesHistory(
  supplierId: string | undefined,
  filters: analyticsService.SalesFilters,
) {
  return useQuery({
    queryKey: ["supplier", "sales", supplierId, filters],
    queryFn: () => analyticsService.fetchSalesHistory(supplierId!, filters),
    enabled: !!supplierId,
    placeholderData: (prev) => prev,
  });
}

export function usePharmacyPartners(supplierId: string | undefined) {
  return useQuery({
    queryKey: ["supplier", "partners", supplierId],
    queryFn: () => analyticsService.fetchPharmacyPartners(supplierId!),
    enabled: !!supplierId,
  });
}

export function useSupplierReports(supplierId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ["supplier", "reports", supplierId, from, to],
    queryFn: () => analyticsService.loadReports(supplierId!, from, to),
    enabled: !!supplierId,
    placeholderData: (prev) => prev,
  });
}

export function useSupplierProfile(ctx: supplierService.SupplierContext | undefined) {
  return useQuery({
    queryKey: ["supplier", "profile", ctx?.supplierId],
    queryFn: () => supplierService.fetchSupplierProfile(ctx!),
    enabled: !!ctx,
  });
}

export function useUpdateSupplierProfile(ctx: supplierService.SupplierContext | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: supplierService.SupplierProfileUpdate) =>
      supplierService.updateSupplierProfile(ctx!, input),
    onSuccess: () => {
      toast.success("Profile saved");
      void qc.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
