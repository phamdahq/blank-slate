import { useLiveQuery } from "dexie-react-hooks";
import { db, isBrowser, type OrderRow } from "@/db/dexie";
import { orderSettingsRepo } from "@/db/orders";
import { useSession } from "@/hooks/use-session";

/** Whether the pharmacy owner has enabled the Orders workflow. */
export function useOrdersEnabled(pharmacyId?: string | null): boolean {
  const session = useSession();
  const id = pharmacyId ?? session.pharmacyId;
  return (
    useLiveQuery(() => orderSettingsRepo.isEnabled(id), [id], false) ?? false
  );
}

/** Live list of local orders, newest first. */
export function useOrders(pharmacyId: string | null | undefined): OrderRow[] {
  return (
    useLiveQuery(
      async () => {
        if (!isBrowser || !pharmacyId) return [] as OrderRow[];
        const rows = await db.orders.where("pharmacy_id").equals(pharmacyId).toArray();
        return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      [pharmacyId],
      [] as OrderRow[],
    ) ?? []
  );
}
