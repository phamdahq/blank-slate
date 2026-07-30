/**
 * Central export map for all services. UI code should import from
 * `@/services/...` — never call Supabase or Dexie directly.
 */
export * as platformConfigService from "./platformConfigService";
export * as pharmacyService from "./pharmacyService";
export * as profileService from "./profileService";
export * as inventoryService from "./inventoryService";
export * as salesService from "./pos/salesService";
export * as catalogService from "./pos/catalogService";
export * as productService from "./admin/productService";
export * as payoutService from "./admin/payoutService";
export * as stockService from "./inventory/stockService";
export * as inventoryCatalogService from "./inventory/catalogService";
export * as expenseService from "./expenseService";
export * as dashboardService from "./dashboardService";
export * as realtimeService from "./sync/realtimeService";
