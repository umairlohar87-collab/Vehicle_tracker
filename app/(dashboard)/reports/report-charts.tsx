"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDistance, humanizeEnum } from "@/lib/format";

/**
 * Every chart here plots one measure, so all three share a single accent hue
 * rather than a categorical palette: colour carries no identity when there is
 * only one series, and a rainbow of bars would imply a grouping that the data
 * does not have. Ranking is carried by bar length and by the axis order.
 *
 * Titles name the series, so none of these needs a legend.
 */

const AXIS_FONT = { fontSize: 11 };

function TooltipCard({
  label,
  rows,
}: {
  label: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-lg bg-popover px-2.5 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="font-medium text-popover-foreground">{label}</p>
      {rows.map((row) => (
        <p key={row.label} className="mt-0.5 text-muted-foreground">
          {row.label}: <span className="tabular-nums text-popover-foreground">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

export function DistanceTrendChart({
  data,
}: {
  data: { day: string; distanceM: number; trips: number }[];
}) {
  return (
    <div className="viz-root h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="distanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--viz-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ ...AXIS_FONT, fill: "var(--viz-axis)" }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis
            tick={{ ...AXIS_FONT, fill: "var(--viz-axis)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}km`}
          />
          <Tooltip
            cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              return (
                <TooltipCard
                  label={String(label)}
                  rows={[
                    { label: "Distance", value: formatDistance(point.distanceM) },
                    { label: "Trips", value: String(point.trips) },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="distanceM"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#distanceFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VehicleDistanceChart({
  data,
}: {
  data: { plate: string; distanceM: number; trips: number }[];
}) {
  return (
    <div
      className="viz-root w-full"
      style={{ height: Math.max(160, data.length * 34 + 24) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid
            stroke="var(--viz-grid)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ ...AXIS_FONT, fill: "var(--viz-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}km`}
          />
          <YAxis
            type="category"
            dataKey="plate"
            tick={{ ...AXIS_FONT, fill: "var(--viz-axis)" }}
            tickLine={false}
            axisLine={false}
            width={84}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              return (
                <TooltipCard
                  label={point.plate}
                  rows={[
                    { label: "Distance", value: formatDistance(point.distanceM) },
                    { label: "Trips", value: String(point.trips) },
                  ]}
                />
              );
            }}
          />
          {/* 4px rounded data-end, square against the baseline. */}
          <Bar
            dataKey="distanceM"
            fill="var(--series-1)"
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            label={{
              position: "right",
              fontSize: 11,
              fill: "var(--viz-axis)",
              // Recharts types this as RenderableText, which is wider than the
              // number the bar actually carries.
              formatter: (value: unknown) => formatDistance(Number(value)),
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AlertsByKindChart({
  data,
}: {
  data: { kind: string; count: number }[];
}) {
  const rows = data.map((d) => ({ ...d, label: humanizeEnum(d.kind) }));

  return (
    <div
      className="viz-root w-full"
      style={{ height: Math.max(160, rows.length * 32 + 24) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid
            stroke="var(--viz-grid)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ ...AXIS_FONT, fill: "var(--viz-axis)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...AXIS_FONT, fill: "var(--viz-axis)" }}
            tickLine={false}
            axisLine={false}
            width={132}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof rows)[number];
              return (
                <TooltipCard
                  label={point.label}
                  rows={[{ label: "Alerts", value: String(point.count) }]}
                />
              );
            }}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            label={{
              position: "right",
              fontSize: 11,
              fill: "var(--viz-axis)",
            }}
          >
            {rows.map((row) => (
              <Cell key={row.kind} fill="var(--series-1)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
