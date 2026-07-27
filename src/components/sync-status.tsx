import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnline } from "@/hooks/use-online";
import { useOutboxCount, useSyncState } from "@/hooks/use-sync";
import { cn } from "@/lib/utils";

/** Compact sync indicator for the app top bar. */
export function SyncStatus() {
  const online = useOnline();
  const { draining } = useSyncState();
  const pending = useOutboxCount();

  const label = !online
    ? "Offline"
    : draining
      ? `Syncing${pending ? ` · ${pending}` : ""}`
      : pending > 0
        ? `Queued · ${pending}`
        : "Synced";

  const tone = !online
    ? "bg-warning-soft text-warning-soft-foreground"
    : pending > 0
      ? "bg-primary-soft text-primary-soft-foreground"
      : "bg-success-soft text-success-soft-foreground";

  const Icon = !online ? CloudOff : draining ? RefreshCw : pending > 0 ? RefreshCw : CheckCircle2;

  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-mono-data text-[11px] font-bold uppercase tracking-wider",
        tone,
      )}
      title={label}
    >
      <Icon className={cn("h-3.5 w-3.5", draining && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
