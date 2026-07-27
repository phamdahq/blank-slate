/**
 * POS catalog service — product + batch reads for the sales floor.
 */
import { inventoryRepo, productsRepo } from "@/db/repositories";

export const searchProducts = productsRepo.search.bind(productsRepo);
export const getProduct = productsRepo.get.bind(productsRepo);
export const listProducts = productsRepo.list.bind(productsRepo);

export const batchesForProduct = inventoryRepo.byProduct.bind(inventoryRepo);
export const stockFor = inventoryRepo.stockFor.bind(inventoryRepo);
export const pickFEFO = inventoryRepo.pickFEFO.bind(inventoryRepo);
