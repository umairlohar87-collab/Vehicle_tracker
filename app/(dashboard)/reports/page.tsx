import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FileBarChart, Gauge, Hourglass, Route } from "lucide-react";

import {
  AlertsByKindChart,
  DistanceTrendChart,
  VehicleDistanceChart,
} from "@/app/(dashboard)/reports/report-charts";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { getReport } from "@/lib/dal";
import { formatDistance, formatDuration, formatSpeed } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reports",
};

const RANGES = [7, 30, 90] as const;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const sp = await searchParams;
  const requested = Number(one(sp.days) ?? "30");
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;

  const report = await getReport(days);
  const { totals, perVehicle, perDay, alertsByKind } = report;

  const hasData = totals.trips > 0;
  // Idle as a share of engine-on time is the number a fleet manager acts on;
  // the raw seconds on their own say little.
  const idleShare =
    totals.durationS > 0
      ? Math.round((totals.idleTimeS / totals.durationS) * 100)
      : 0;

  return (
    <div data-tone="orange" className="flex flex-col gap-4">
      <PageHeader
        module="reports"
        title="Reports"
        description={`Fleet activity over the last ${days} days.`}
        action={
          <div className="flex gap-1">
            {RANGES.map((range) => (
              <Button
                key={range}
                size="sm"
                variant={range === days ? "secondary" : "ghost"}
                nativeButton={false}
                render={<Link href={`/reports?days=${range}`} />}
              >
                {range}d
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trips" value={totals.trips} icon={Route} tone="violet" />
        <StatCard
          label="Distance"
          value={formatDistance(totals.distanceM)}
          icon={Gauge}
          tone="orange"
        />
        <StatCard
          label="Driving time"
          value={formatDuration(totals.durationS)}
          icon={Clock}
          tone="sky"
        />
        <StatCard
          label="Idle share"
          value={idleShare}
          suffix="%"
          icon={Hourglass}
          tone="amber"
          hint={`of ${formatDuration(totals.durationS)} engine-on time`}
        />
      </div>

      {!hasData ? (
        <Card className="py-0">
          <EmptyState
            icon={FileBarChart}
            title="No activity in this period"
            description="Reports fill in once trips are recorded. Try a wider date range."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Distance per day</CardTitle>
              <CardDescription>
                Total kilometres driven by the whole fleet each day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DistanceTrendChart data={perDay} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distance per vehicle</CardTitle>
                <CardDescription>
                  Which vehicles carried the work over this period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VehicleDistanceChart data={perVehicle.slice(0, 10)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alerts by type</CardTitle>
                <CardDescription>
                  {alertsByKind.reduce((sum, a) => sum + a.count, 0)} alerts
                  raised in this period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsByKind.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No alerts in this period.
                  </p>
                ) : (
                  <AlertsByKindChart data={alertsByKind.slice(0, 8)} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="py-0">
            <CardHeader className="pt-4">
              <CardTitle>Per-vehicle breakdown</CardTitle>
              <CardDescription>
                The same figures as the chart above, in full.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Vehicle</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead className="text-right">Driving time</TableHead>
                    <TableHead className="text-right">Idle</TableHead>
                    <TableHead className="text-right">Max speed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perVehicle.map((row) => (
                    <TableRow key={row.vehicleId}>
                      <TableCell className="pl-4 font-medium">
                        <Link
                          href={`/vehicles/${row.vehicleId}`}
                          className="hover:underline"
                        >
                          {row.plate}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.trips}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDistance(row.distanceM)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDuration(row.durationS)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatDuration(row.idleTimeS)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatSpeed(row.maxSpeed)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
