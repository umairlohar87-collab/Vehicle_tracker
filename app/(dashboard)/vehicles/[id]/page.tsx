import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";

import { VehicleForm } from "@/app/(dashboard)/vehicles/vehicle-form";
import { MapView } from "@/components/map/map-view";
import { DetailList, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDrivers, getVehicle, getVehicleTrack, verifySession } from "@/lib/dal";
import {
  formatDate,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatMoney,
  formatOdometer,
  formatRelative,
  formatSpeed,
  humanizeEnum,
} from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export async function generateMetadata({
  params,
}: PageProps<"/vehicles/[id]">): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicle(id);
  return { title: vehicle?.plate ?? "Vehicle" };
}

export default async function VehicleDetailPage({
  params,
}: PageProps<"/vehicles/[id]">) {
  const { id } = await params;
  const session = await verifySession();
  const canWrite = hasPermission(session.role, "vehicle:write");

  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();

  const [track, drivers] = await Promise.all([
    getVehicleTrack(vehicle.id),
    canWrite ? getDrivers() : Promise.resolve([]),
  ]);

  const latest = track.at(-1);

  return (
    <div data-tone="indigo" className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2"
        nativeButton={false}
        render={<Link href="/vehicles" />}
      >
        <ArrowLeft />
        All vehicles
      </Button>

      <PageHeader
        module="vehicles"
        title={vehicle.plate}
        description={
          [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ") ||
          "No make or model recorded"
        }
        action={
          canWrite ? (
            <VehicleForm
              vehicle={vehicle}
              drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
            />
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent track</CardTitle>
            <CardDescription>
              {track.length > 0
                ? `Last ${track.length} positions, ending ${formatRelative(latest?.ts)}.`
                : "This vehicle has not reported a position yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <MapView
                path={track.map((p) => ({ lat: p.lat, lng: p.lng }))}
                vehicles={
                  latest
                    ? [
                        {
                          id: vehicle.id,
                          plate: vehicle.plate,
                          label: [vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(" "),
                          lat: latest.lat,
                          lng: latest.lng,
                          speed: latest.speed,
                          heading: null,
                          ignition: null,
                          deviceStatus: vehicle.device?.status ?? null,
                          driverName: vehicle.driver?.name ?? null,
                          ts: latest.ts,
                        },
                      ]
                    : []
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <DetailList
              items={[
                { label: "Status", value: <StatusBadge value={vehicle.status} /> },
                { label: "Driver", value: vehicle.driver?.name ?? "Unassigned" },
                { label: "Odometer", value: formatOdometer(vehicle.odometer) },
                { label: "Colour", value: vehicle.color ?? "—" },
                { label: "Fuel", value: vehicle.fuelType ?? "—" },
                { label: "VIN", value: vehicle.vin ?? "—" },
                { label: "Added", value: formatDate(vehicle.createdAt) },
                {
                  label: "Last fix",
                  value: latest ? formatRelative(latest.ts) : "Never",
                },
              ]}
            />

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium">Tracking device</p>
              {vehicle.device ? (
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <span className="flex items-center gap-2">
                    <StatusBadge value={vehicle.device.status} />
                    <span className="text-xs text-muted-foreground">
                      seen {formatRelative(vehicle.device.lastSeenAt)}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    IMEI {vehicle.device.imei}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {vehicle.device.model ?? "Unknown model"} ·{" "}
                    {vehicle.device.protocol}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  No device paired. Add one under Settings → Devices.
                </p>
              )}
            </div>

            {vehicle.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{vehicle.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="pt-4">
            <CardTitle>Recent trips</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {vehicle.trips.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No trips recorded.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Started</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicle.trips.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-4">
                        <Link href={`/trips/${t.id}`} className="hover:underline">
                          {formatDateTime(t.startTs)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDistance(t.distanceM)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDuration(t.durationS)}
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
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="pt-4">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {vehicle.maintenance.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nothing scheduled.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Job</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicle.maintenance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-4">{m.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {humanizeEnum(m.kind)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={m.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDate(m.dueAt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(m.costCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
