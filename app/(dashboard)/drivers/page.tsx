import type { Metadata } from "next";
import Link from "next/link";
import { CircleUser } from "lucide-react";

import { deleteDriver } from "@/app/(dashboard)/actions";
import { DriverForm } from "@/app/(dashboard)/drivers/driver-form";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { getDrivers, verifySession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Drivers",
};

/** A licence inside 30 days is worth flagging before it lapses. */
function expiryState(expiry: Date | null) {
  if (!expiry) return null;
  const days = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Expired", variant: "destructive" as const };
  if (days <= 30) return { label: `${days}d left`, variant: "outline" as const };
  return null;
}

export default async function DriversPage() {
  const session = await verifySession();
  const canWrite = hasPermission(session.role, "driver:write");
  const drivers = await getDrivers();

  return (
    <div data-tone="teal" className="flex flex-col gap-4">
      <PageHeader
        module="drivers"
        title="Drivers"
        description={`${drivers.length} driver${drivers.length === 1 ? "" : "s"} on record.`}
        action={canWrite ? <DriverForm /> : null}
      />

      <Card className="py-0">
        {drivers.length === 0 ? (
          <EmptyState
            icon={CircleUser}
            title="No drivers yet"
            description="Add drivers so trips and alerts can be attributed to a person, not just a plate."
            action={canWrite ? <DriverForm /> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Licence</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                {canWrite && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => {
                const expiry = expiryState(d.licenseExpiry);

                return (
                  <TableRow key={d.id}>
                    <TableCell className="pl-4 font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex flex-col">
                        <span>{d.email ?? "—"}</span>
                        <span className="text-xs">{d.phone ?? ""}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {d.licenseNumber ?? "—"}
                        </span>
                        {expiry && (
                          <Badge variant={expiry.variant}>{expiry.label}</Badge>
                        )}
                      </span>
                      {d.licenseExpiry && (
                        <span className="block text-xs text-muted-foreground">
                          expires {formatDate(d.licenseExpiry)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.vehicles.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {d.vehicles.map((v) => (
                            <Badge
                              key={v.id}
                              variant="outline"
                              render={<Link href={`/vehicles/${v.id}`} />}
                            >
                              {v.plate}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={d.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {d._count.trips}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="pr-2">
                        <span className="flex items-center justify-end gap-1">
                          <DriverForm driver={d} />
                          <form action={deleteDriver}>
                            <input type="hidden" name="id" value={d.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="xs"
                              className="text-destructive"
                            >
                              Remove
                            </Button>
                          </form>
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
