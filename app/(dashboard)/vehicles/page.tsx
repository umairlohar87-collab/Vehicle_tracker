import type { Metadata } from "next";
import Link from "next/link";
import { Car } from "lucide-react";

import { VehicleForm } from "@/app/(dashboard)/vehicles/vehicle-form";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDrivers, getVehicles, verifySession } from "@/lib/dal";
import { formatOdometer, formatRelative } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Vehicles",
};

export default async function VehiclesPage() {
  const session = await verifySession();
  const canWrite = hasPermission(session.role, "vehicle:write");

  // A VIEWER has no driver:read permission, and getDrivers() would 403 the
  // whole page - but they also never see the form the list feeds.
  const [vehicles, drivers] = await Promise.all([
    getVehicles(),
    canWrite ? getDrivers() : Promise.resolve([]),
  ]);

  const driverOptions = drivers.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div data-tone="indigo" className="flex flex-col gap-4">
      <PageHeader
        module="vehicles"
        title="Vehicles"
        description={`${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} in this fleet.`}
        action={canWrite ? <VehicleForm drivers={driverOptions} /> : null}
      />

      <Card className="py-0">
        {vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No vehicles yet"
            description="Add your first vehicle, then pair a tracking device with it to start seeing positions."
            action={canWrite ? <VehicleForm drivers={driverOptions} /> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Plate</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-right">Odometer</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                {canWrite && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="pl-4 font-medium">
                    <Link href={`/vehicles/${v.id}`} className="hover:underline">
                      {v.plate}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[v.make, v.model, v.year].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={v.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {v.driver?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    {v.device ? (
                      <span className="flex items-center gap-2">
                        <StatusBadge value={v.device.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(v.device.lastSeenAt)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatOdometer(v.odometer)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {v._count.trips}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="pr-2 text-right">
                      <VehicleForm vehicle={v} drivers={driverOptions} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
