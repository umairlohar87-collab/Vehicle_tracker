import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  Car,
  Info,
  Radio,
  Route,
  TriangleAlert,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { DistanceTrendChart } from "@/app/(dashboard)/reports/report-charts";
import { Button } from "@/components/ui/button";
import {
  getCurrentUser,
  getDashboardTrend,
  getFleetSummary,
  getRecentAlerts,
} from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import type { Tone } from "@/lib/tone";

export const metadata: Metadata = {
  title: "Overview",
};

const SEVERITY_VARIANT = {
  INFO: "secondary",
  WARNING: "outline",
  CRITICAL: "destructive",
} as const;

/** Severity carries its own hue here, independent of the section's rose. */
const SEVERITY_STYLE: Record<
  keyof typeof SEVERITY_VARIANT,
  { tone: Tone; icon: typeof Info }
> = {
  INFO: { tone: "sky", icon: Info },
  WARNING: { tone: "amber", icon: TriangleAlert },
  CRITICAL: { tone: "rose", icon: TriangleAlert },
};

export default async function OverviewPage() {
  const [user, summary, alerts, trend] = await Promise.all([
    getCurrentUser(),
    getFleetSummary(),
    getRecentAlerts(),
    getDashboardTrend(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="tone-wash relative overflow-hidden rounded-2xl border px-4 py-5 sm:px-6 sm:py-6">
        <p className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
          {user.org.name}
        </p>
        <h1 className="mt-1 text-display text-gradient">
          {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Overview"}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {summary.onlineDevices} of {summary.devices} trackers are reporting
          right now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vehicles"
          value={summary.vehicles}
          icon={Car}
          tone="indigo"
          href="/vehicles"
        />
        <StatCard
          label="Devices online"
          value={summary.onlineDevices}
          suffix={` / ${summary.devices}`}
          icon={Radio}
          tone="sky"
          href="/map"
        />
        <StatCard
          label="Trips in progress"
          value={summary.activeTrips}
          icon={Route}
          tone="violet"
          href="/trips"
        />
        <StatCard
          label="Unacknowledged alerts"
          value={summary.openAlerts}
          icon={BellRing}
          tone="rose"
          href="/alerts"
        />
      </div>

      <Card data-tone="rose">
        <CardHeader>
          <CardTitle>Recent alerts</CardTitle>
          <CardDescription>
            The latest events raised across your fleet.
          </CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/alerts" />}
            >
              All alerts
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No alerts yet. They will appear here once devices start reporting.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {alerts.map((alert) => {
                const style = SEVERITY_STYLE[alert.severity];

                return (
                  <li
                    key={alert.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <IconBadge
                      icon={style.icon}
                      tone={style.tone}
                      size="sm"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{alert.message}</p>
                      <p className="text-caption text-muted-foreground">
                        {alert.vehicle?.plate ?? "Unassigned"} &middot;{" "}
                        {formatDateTime(alert.ts)}
                      </p>
                    </div>
                    <Badge variant={SEVERITY_VARIANT[alert.severity]}>
                      {alert.severity.toLowerCase()}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card data-tone="brand">
        <CardHeader>
          <CardTitle>Distance over the last two weeks</CardTitle>
          <CardDescription>
            Kilometres covered by the whole fleet each day.
          </CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/reports" />}
            >
              Full reports
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No trips recorded in the last two weeks.
            </p>
          ) : (
            <DistanceTrendChart
              data={trend.map((d) => ({
                day: d.day,
                distanceM: Math.round(d.km * 1000),
                trips: d.trips,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
