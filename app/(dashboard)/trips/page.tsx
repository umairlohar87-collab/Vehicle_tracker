import type { Metadata } from "next";
import Link from "next/link";
import { Route } from "lucide-react";

import { TripFilters } from "@/app/(dashboard)/trips/trip-filters";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTrips, getVehicles } from "@/lib/dal";
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatSpeed,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Trips",
};

/** Ignores a malformed date in the query string rather than throwing on it. */
function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TripsPage({
  searchParams,
}: PageProps<"/trips">) {
  const sp = await searchParams;

  const page = Number(one(sp.page) ?? "1");
  const { trips, total, pageCount } = await getTrips({
    vehicleId: one(sp.vehicleId),
    from: parseDate(one(sp.from)),
    to: parseDate(one(sp.to), true),
    page: Number.isFinite(page) ? page : 1,
  });

  const vehicles = await getVehicles();

  // Carries the current filters onto the pagination links.
  const query = new URLSearchParams();
  for (const key of ["vehicleId", "from", "to"]) {
    const value = one(sp[key]);
    if (value) query.set(key, value);
  }
  const pageHref = (n: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(n));
    return `/trips?${next.toString()}`;
  };

  const currentPage = Math.min(Math.max(1, page || 1), pageCount);

  return (
    <div data-tone="violet" className="flex flex-col gap-4">
      <PageHeader
        module="trips"
        title="Trips"
        description={`${total} trip${total === 1 ? "" : "s"} match the current filters.`}
      />

      <TripFilters vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))} />

      <Card className="py-0">
        {trips.length === 0 ? (
          <EmptyState
            icon={Route}
            title="No trips found"
            description="Trips are created automatically from device positions once ignition and movement are reported."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Started</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Idle</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-4">
                    <Link href={`/trips/${t.id}`} className="hover:underline">
                      {formatDateTime(t.startTs)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/vehicles/${t.vehicle.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.vehicle.plate}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.driver?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">
                    {t.startAddress && t.endAddress
                      ? `${t.startAddress} → ${t.endAddress}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDistance(t.distanceM)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDuration(t.durationS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(t.idleTimeS)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatSpeed(t.maxSpeed)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={t.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              nativeButton={false}
              render={<Link href={pageHref(currentPage - 1)} />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              nativeButton={false}
              render={<Link href={pageHref(currentPage + 1)} />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
