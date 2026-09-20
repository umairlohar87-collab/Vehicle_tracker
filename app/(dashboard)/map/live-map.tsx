"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, RefreshCw } from "lucide-react";

import { MapView } from "@/components/map/map-view";
import type { MapFence, MapVehicle } from "@/components/map/map-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative, formatSpeed } from "@/lib/format";

const REFRESH_MS = 30_000;

export function LiveMap({
  vehicles,
  fences,
}: {
  vehicles: MapVehicle[];
  fences: MapFence[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // `router.refresh()` re-runs the server component and streams new positions
  // in without dropping the map's pan/zoom, which a full navigation would.
  useEffect(() => {
    if (!autoRefresh) return;

    const id = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, REFRESH_MS);

    return () => window.clearInterval(id);
  }, [autoRefresh, router]);

  return (
    <div className="grid gap-4 lg:h-[calc(100svh-7.5rem)] lg:grid-cols-[20rem_1fr]">
      <div className="flex min-h-0 flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div>
            <p className="text-sm font-medium">Fleet</p>
            <p className="text-xs text-muted-foreground">
              {vehicles.length} reporting
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Refresh now"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              <RefreshCw className={cn("size-4", pending && "animate-spin")} />
            </Button>
            <Button
              size="xs"
              variant={autoRefresh ? "secondary" : "ghost"}
              onClick={() => setAutoRefresh((on) => !on)}
            >
              {autoRefresh ? "Live" : "Paused"}
            </Button>
          </div>
        </div>

        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1.5 pb-2">
          {vehicles.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              No vehicle has reported a position yet.
            </li>
          )}

          {vehicles.map((v) => {
            const moving = (v.speed ?? 0) > 3;
            const active = selected === v.id;

            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setSelected(active ? null : v.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      v.deviceStatus !== "ONLINE"
                        ? "bg-muted-foreground"
                        : moving
                          ? "bg-green-600"
                          : "bg-amber-500",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {v.plate}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {formatSpeed(v.speed)}
                      </Badge>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.driverName ?? "No driver"} · {formatRelative(v.ts)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-h-[28rem] overflow-hidden rounded-xl ring-1 ring-foreground/10 lg:min-h-0">
        <MapView vehicles={vehicles} fences={fences} focusId={selected} />
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground lg:col-span-2">
          <Link href={`/vehicles/${selected}`} className="inline-flex items-center gap-1 underline">
            <Car className="size-3" />
            Open vehicle detail
          </Link>
        </p>
      )}
    </div>
  );
}
