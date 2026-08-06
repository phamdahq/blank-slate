import { useQuery } from "@tanstack/react-query";
import * as marketplaceService from "@/services/marketplace/marketplaceService";
import type {
  MarketplaceFilters,
} from "@/services/marketplace/marketplaceService";

export function useMarketplaceSuppliers() {
  return useQuery({
    queryKey: ["marketplace-suppliers"],
    queryFn: () => marketplaceService.fetchMarketplaceSuppliers(),
    staleTime: 5 * 60_000,
  });
}

export function useMarketplaceListings(filters: MarketplaceFilters) {
  return useQuery({
    queryKey: ["marketplace-listings", filters.search, filters.supplierId, filters.category],
    queryFn: () => marketplaceService.fetchMarketplaceListings(filters),
    placeholderData: (prev) => prev,
  });
}