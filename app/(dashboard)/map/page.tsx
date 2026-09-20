import type { Metadata } from "next";

import { LiveMap } from "@/app/(dashboard)/map/live-map";
import { PageHeader } from "@/components/dashboard/page-header";
import { getGeofences, getLiveVehicles } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Live map",
};

// Positions change constantly, so this page must never be served from the
// full-route cache; the client polls it back through router.refresh().
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [vehicles, fences] = await Promise.all([
    getLiveVehicles(),
    getGeofences(),
  ]);

  return (
    <div data-tone="sky" className="flex flex-col gap-4">
      <PageHeader
        module="map"
        title="Live map"
        description="Last known position of every vehicle, refreshed every 30 seconds."
      />

      <LiveMap
        vehicles={vehicles}
        fences={fences.map((f) => ({
          id: f.id,
          name: f.name,
          centerLat: f.centerLat,
          centerLng: f.centerLng,
          radiusM: f.radiusM,
          color: f.color,
          active: f.active,
        }))}
      />
    </div>
  );
}
