import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, isBrowser } from "@/db/dexie";
import { subscribeSync, type SyncState } from "@/db/sync";

export function useSyncState(): SyncState {
  const [s, setS] = useState<SyncState>({ online: true, draining: false });
  useEffect(() => subscribeSync(setS), []);
  return s;
}

/** Number of pending outbox entries. Reactively updates. */
export function useOutboxCount(): number {
  return useLiveQuery(() => (isBrowser ? db.outbox.count() : Promise.resolve(0)), [], 0) ?? 0;
}
