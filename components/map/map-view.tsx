"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { MapCanvasProps } from "@/components/map/map-canvas";

/**
 * Leaflet reaches for `window` at import time, so the canvas can never be
 * rendered on the server. `ssr: false` is only allowed inside a client
 * component, which is the entire reason this thin wrapper exists - server
 * pages import this, never map-canvas directly.
 */
const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

export function MapView(props: MapCanvasProps) {
  return <MapCanvas {...props} />;
}
