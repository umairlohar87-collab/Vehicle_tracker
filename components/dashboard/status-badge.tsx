import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/tone";

/**
 * One place that decides what colour an enum reads as, so ONLINE is the same
 * green on the vehicles table, the map sidebar and the device list. Anything
 * not listed falls back to the neutral slate rather than throwing.
 *
 * These are deliberately not the section hues: a status means the same thing
 * wherever it appears, so it keeps its own colour even on a page tinted amber
 * or rose.
 */
const TONES: Record<string, Tone> = {
  // DeviceStatus
  ONLINE: "emerald",
  OFFLINE: "slate",
  UNASSIGNED: "slate",
  // VehicleStatus / DriverStatus
  ACTIVE: "emerald",
  INACTIVE: "slate",
  MAINTENANCE: "amber",
  SUSPENDED: "rose",
  // TripStatus
  IN_PROGRESS: "sky",
  COMPLETED: "emerald",
  // AlertSeverity
  INFO: "sky",
  WARNING: "amber",
  CRITICAL: "rose",
  // MaintenanceStatus
  SCHEDULED: "indigo",
  CANCELLED: "slate",
};

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <Badge
      data-tone={TONES[value] ?? "slate"}
      variant="outline"
      className={cn(
        "gap-1.5 border-transparent bg-tone/12 pl-1.5 text-tone-ink ring-1 ring-tone/20 ring-inset",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-tone" />
      {humanizeEnum(value)}
    </Badge>
  );
}
