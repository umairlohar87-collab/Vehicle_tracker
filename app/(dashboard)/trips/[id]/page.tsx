import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Gauge, Hourglass, TrendingUp } from "lucide-react";

import { MapView } from "@/components/map/map-view";
import { DetailList, PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTrip } from "@/lib/dal";
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatSpeed,
} from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/trips/[id]">): Promise<Metadata> {
  const { id } = await params;
  const result = await getTrip(id);
  return {
    title: result ? `Trip · ${result.trip.vehicle.plate}` : "Trip",
  };
}

export default async function TripDetailPage({
  params,
}: PageProps<"/trips/[id]">) {
  const { id } = await params;
  const result = await getTrip(id);
  if (!result) notFound();

  const { trip, path } = result;

  return (
    <div data-tone="violet" className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2"
        nativeButton={false}
        render={<Link href="/trips" />}
      >
        <ArrowLeft />
        All trips
      </Button>

      <PageHeader
        module="trips"
        title={`${trip.vehicle.plate} · ${formatDateTime(trip.startTs)}`}
        description={
          trip.startAddress && trip.endAddress
            ? `${trip.startAddress} → ${trip.endAddress}`
            : "No addresses resolved for this trip."
        }
        action={<StatusBadge value={trip.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Distance"
          value={formatDistance(trip.distanceM)}
          icon={Gauge}
          tone="orange"
        />
        <StatCard
          label="Duration"
          value={formatDuration(trip.durationS)}
          icon={Clock}
          tone="sky"
        />
        <StatCard
          label="Idle time"
          value={formatDuration(trip.idleTimeS)}
          icon={Hourglass}
          tone="amber"
        />
        <StatCard
          label="Max speed"
          value={formatSpeed(trip.maxSpeed)}
          icon={TrendingUp}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Route</CardTitle>
            <CardDescription>
              {path.length > 1
                ? `${path.length} position fixes recorded during this trip.`
                : "Not enough position fixes to draw a route."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <MapView path={path.map((p) => ({ lat: p.lat, lng: p.lng }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                {
                  label: "Vehicle",
                  value: (
                    <Link
                      href={`/vehicles/${trip.vehicle.id}`}
                      className="hover:underline"
                    >
                      {trip.vehicle.plate}
                    </Link>
                  ),
                },
                { label: "Driver", value: trip.driver?.name ?? "Unassigned" },
                { label: "Started", value: formatDateTime(trip.startTs) },
                {
                  label: "Ended",
                  value: trip.endTs ? formatDateTime(trip.endTs) : "In progress",
                },
                { label: "Average speed", value: formatSpeed(trip.avgSpeed) },
                { label: "Max speed", value: formatSpeed(trip.maxSpeed) },
                {
                  label: "Start",
                  value: trip.startAddress ?? formatCoords(trip.startLat, trip.startLng),
                },
                {
                  label: "End",
                  value: trip.endAddress ?? formatCoords(trip.endLat, trip.endLng),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatCoords(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
