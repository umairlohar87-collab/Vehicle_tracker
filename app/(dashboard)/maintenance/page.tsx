import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Check, TriangleAlert, Wrench } from "lucide-react";

import {
  completeMaintenance,
  deleteMaintenance,
} from "@/app/(dashboard)/actions";
import { MaintenanceForm } from "@/app/(dashboard)/maintenance/maintenance-form";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { getMaintenanceRecords, getVehicles, verifySession } from "@/lib/dal";
import { formatDate, formatMoney, formatOdometer, humanizeEnum } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Maintenance",
};

type Record_ = Awaited<ReturnType<typeof getMaintenanceRecords>>[number];

/**
 * A job is overdue when either trigger has passed. The status column stays
 * whatever was set by hand - this only decides what the row is flagged as, so
 * a due date sliding past does not silently rewrite stored data.
 */
function dueState(record: Record_) {
  if (record.status === "COMPLETED" || record.status === "CANCELLED") return null;

  const dateOverdue = record.dueAt != null && record.dueAt.getTime() < Date.now();
  const odoOverdue =
    record.dueOdometer != null && record.vehicle.odometer >= record.dueOdometer;

  if (dateOverdue || odoOverdue) {
    return { label: "Overdue", variant: "destructive" as const };
  }

  if (record.dueAt) {
    const days = Math.ceil((record.dueAt.getTime() - Date.now()) / 86_400_000);
    if (days <= 14) {
      return { label: `Due in ${days}d`, variant: "outline" as const };
    }
  }

  return null;
}

export default async function MaintenancePage() {
  const session = await verifySession();
  const canWrite = hasPermission(session.role, "vehicle:write");

  const [records, vehicles] = await Promise.all([
    getMaintenanceRecords(),
    getVehicles(),
  ]);

  const vehicleOptions = vehicles.map((v) => ({ id: v.id, plate: v.plate }));

  const open = records.filter(
    (r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS",
  );
  const overdue = open.filter((r) => dueState(r)?.label === "Overdue");
  const spend = records
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + (r.costCents ?? 0), 0);

  return (
    <div data-tone="amber" className="flex flex-col gap-4">
      <PageHeader
        module="maintenance"
        title="Maintenance"
        description="Servicing, repairs and inspections scheduled across the fleet."
        action={
          canWrite ? <MaintenanceForm vehicles={vehicleOptions} /> : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open jobs"
          value={open.length}
          icon={Wrench}
          tone="amber"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={TriangleAlert}
          tone="rose"
        />
        <StatCard
          label="Completed spend"
          value={formatMoney(spend)}
          icon={Banknote}
          tone="emerald"
        />
      </div>

      <Card className="py-0">
        {records.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nothing scheduled"
            description="Schedule a service against a vehicle and it will show here until it is completed."
            action={
              canWrite ? <MaintenanceForm vehicles={vehicleOptions} /> : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Job</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                {canWrite && <TableHead className="w-32" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => {
                const due = dueState(r);

                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-medium">{r.title}</TableCell>
                    <TableCell>
                      <Link
                        href={`/vehicles/${r.vehicle.id}`}
                        className="hover:underline"
                      >
                        {r.vehicle.plate}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {humanizeEnum(r.kind)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={r.status} />
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {r.dueAt
                            ? formatDate(r.dueAt)
                            : r.dueOdometer != null
                              ? formatOdometer(r.dueOdometer)
                              : "—"}
                        </span>
                        {due && <Badge variant={due.variant}>{due.label}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.vendor ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(r.costCents)}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="pr-2">
                        <span className="flex items-center justify-end gap-1">
                          {r.status !== "COMPLETED" && (
                            <form action={completeMaintenance}>
                              <input type="hidden" name="id" value={r.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Mark complete"
                              >
                                <Check />
                              </Button>
                            </form>
                          )}
                          <MaintenanceForm
                            record={r}
                            vehicles={vehicleOptions}
                          />
                          <form action={deleteMaintenance}>
                            <input type="hidden" name="id" value={r.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="xs"
                              className="text-destructive"
                            >
                              Delete
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
