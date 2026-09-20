import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Check } from "lucide-react";

import {
  acknowledgeAlert,
  acknowledgeAllAlerts,
  toggleAlertRule,
} from "@/app/(dashboard)/actions";
import { AlertFilters } from "@/app/(dashboard)/alerts/alert-filters";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { getAlertRules, getAlerts, getVehicles, verifySession } from "@/lib/dal";
import { formatDateTime, humanizeEnum } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Alerts",
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlertsPage({
  searchParams,
}: PageProps<"/alerts">) {
  const sp = await searchParams;
  const session = await verifySession();
  const canAcknowledge = hasPermission(session.role, "alert:acknowledge");
  const canConfigure = hasPermission(session.role, "alert:configure");

  const page = Number(one(sp.page) ?? "1");

  const [result, vehicles, rules] = await Promise.all([
    getAlerts({
      severity: one(sp.severity),
      kind: one(sp.kind),
      vehicleId: one(sp.vehicleId),
      unacknowledgedOnly: one(sp.unack) === "1",
      page: Number.isFinite(page) ? page : 1,
    }),
    getVehicles(),
    getAlertRules(),
  ]);

  const { alerts, total, unacknowledged, pageCount } = result;

  const query = new URLSearchParams();
  for (const key of ["severity", "kind", "vehicleId", "unack"]) {
    const value = one(sp[key]);
    if (value) query.set(key, value);
  }
  const pageHref = (n: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(n));
    return `/alerts?${next.toString()}`;
  };
  const currentPage = Math.min(Math.max(1, page || 1), pageCount);

  return (
    <div data-tone="rose" className="flex flex-col gap-4">
      <PageHeader
        module="alerts"
        title="Alerts"
        description={`${total} matching · ${unacknowledged} unacknowledged across the fleet.`}
        action={
          canAcknowledge && unacknowledged > 0 ? (
            <form action={acknowledgeAllAlerts}>
              <Button type="submit" variant="outline">
                <Check />
                Acknowledge all
              </Button>
            </form>
          ) : null
        }
      />

      <AlertFilters
        vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))}
      />

      <Card className="py-0">
        {alerts.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No alerts match"
            description="Alerts are raised by the rules below as device positions arrive."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Acknowledged</TableHead>
                {canAcknowledge && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((a) => (
                <TableRow
                  key={a.id}
                  className={a.acknowledgedAt ? "opacity-60" : undefined}
                >
                  <TableCell className="pl-4 whitespace-nowrap">
                    {formatDateTime(a.ts)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {humanizeEnum(a.kind)}
                      {a.geofence && (
                        <Badge variant="outline">{a.geofence.name}</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={a.severity} />
                  </TableCell>
                  <TableCell>
                    {a.vehicle ? (
                      <Link
                        href={`/vehicles/${a.vehicle.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.vehicle.plate}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground">
                    {a.message}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.acknowledgedAt
                      ? `${a.acknowledgedBy?.name ?? "Someone"} · ${formatDateTime(a.acknowledgedAt)}`
                      : "—"}
                  </TableCell>
                  {canAcknowledge && (
                    <TableCell className="pr-2 text-right">
                      {!a.acknowledgedAt && (
                        <form action={acknowledgeAlert}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="outline" size="xs">
                            <Check />
                            Acknowledge
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  )}
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

      <Card>
        <CardHeader>
          <CardTitle>Alert rules</CardTitle>
          <CardDescription>
            What the fleet is watched for. Pausing a rule stops new alerts of
            that type without deleting the ones already raised.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {rules.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              No rules configured yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Rule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Raised</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id} className={r.active ? undefined : "opacity-60"}>
                    <TableCell className="pl-4 font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {humanizeEnum(r.kind)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={r.severity} />
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {r.channels.map((c) => (
                          <Badge key={c} variant="outline">
                            {humanizeEnum(c)}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.vehicleIds.length === 0
                        ? "All vehicles"
                        : `${r.vehicleIds.length} vehicle${r.vehicleIds.length === 1 ? "" : "s"}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r._count.alerts}
                    </TableCell>
                    <TableCell className="pr-2 text-right">
                      {canConfigure && (
                        <form action={toggleAlertRule}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" variant="ghost" size="xs">
                            {r.active ? "Pause" : "Resume"}
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
