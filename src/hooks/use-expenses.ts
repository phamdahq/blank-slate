import { useLiveQuery } from "dexie-react-hooks";
import * as expenseService from "@/services/expenseService";
import type { Expense } from "@/db/dexie";

/** Reactive list of this pharmacy's expenses (offline-first, newest first). */
export function useExpenses(pharmacyId: string | null): Expense[] {
  return (
    useLiveQuery(
      () => (pharmacyId ? expenseService.listExpenses(pharmacyId) : Promise.resolve([])),
      [pharmacyId],
      [] as Expense[],
    ) ?? []
  );
}
