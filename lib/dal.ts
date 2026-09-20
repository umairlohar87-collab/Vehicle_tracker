import "server-only";

import { cache } from "react";
import { forbidden, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

export type SessionContext = {
  userId: string;
  orgId: string;
  role: Role;
};

/**
 * The single place the app learns who is asking. Every data helper below takes
 * its orgId from here, so a query cannot accidentally read another tenant.
 *
 * `cache` memoises this per render pass, so calling it in several components
 * on one page costs one session read.
 */
export const verifySession = cache(async (): Promise<SessionContext> => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    orgId: session.user.orgId,
    role: session.user.role,
  };
});

/** Like `verifySession`, but returns null instead of redirecting. */
export const optionalSession = cache(async (): Promise<SessionContext | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    userId: session.user.id,
    orgId: session.user.orgId,
    role: session.user.role,
  };
});

/** Verifies the session and that the caller holds `permission`. */
export async function requirePermission(
  permission: Permission,
): Promise<SessionContext> {
  const session = await verifySession();
  if (!hasPermission(session.role, permission)) {
    forbidden();
  }
  return session;
}

// --- Data transfer objects --------------------------------------------------
// Pages receive these, never raw rows, so a password hash or TOTP secret cannot
// be serialised into the RSC payload by mistake.
//
// Helpers whose result reaches a client component also narrow the `BigInt`
// columns (odometer, Position.id) to `number`: BigInt has no JSON form, so
// leaving one in a DTO throws "Do not know how to serialize a BigInt" the
// moment the payload crosses to the browser.

export const getCurrentUser = cache(async () => {
  const { userId, orgId } = await verifySession();

  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      twoFactorEnabled: true,
      org: { select: { id: true, name: true, slug: true, timezone: true } },
    },
  });

  if (!user) redirect("/login");

  return user;
});

export const getFleetSummary = cache(async () => {
  const { orgId } = await requirePermission("vehicle:read");

  const [vehicles, devices, onlineDevices, openAlerts, activeTrips] =
    await Promise.all([
      prisma.vehicle.count({ where: { orgId } }),
      prisma.device.count({ where: { orgId } }),
      prisma.device.count({ where: { orgId, status: "ONLINE" } }),
      prisma.alert.count({ where: { orgId, acknowledgedAt: null } }),
      prisma.trip.count({ where: { orgId, status: "IN_PROGRESS" } }),
    ]);

  return { vehicles, devices, onlineDevices, openAlerts, activeTrips };
});

export const getRecentAlerts = cache(async (take = 5) => {
  const { orgId } = await requirePermission("alert:read");

  return prisma.alert.findMany({
    where: { orgId },
    orderBy: { ts: "desc" },
    take,
    select: {
      id: true,
      kind: true,
      severity: true,
      message: true,
      ts: true,
      acknowledgedAt: true,
      vehicle: { select: { id: true, plate: true } },
    },
  });
});

/** Distance covered and trips run by the whole fleet over the last `days`. */
export const getDashboardTrend = cache(async (days = 14) => {
  const { orgId } = await requirePermission("report:read");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<
    { day: Date; distance: bigint | null; trips: bigint }[]
  >`
    SELECT date_trunc('day', "startTs") AS day,
           SUM("distanceM")             AS distance,
           COUNT(*)                     AS trips
    FROM trips
    WHERE "orgId" = ${orgId} AND "startTs" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;

  return rows.map((row) => ({
    day: row.day.toISOString().slice(0, 10),
    km: Math.round(Number(row.distance ?? 0) / 100) / 10,
    trips: Number(row.trips),
  }));
});

// --- Live map ---------------------------------------------------------------

export type LiveVehicle = {
  id: string;
  plate: string;
  label: string;
  status: string;
  deviceStatus: string | null;
  driverName: string | null;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  ignition: boolean | null;
  ts: string;
};

/**
 * Every vehicle that has ever reported, with only its newest position.
 *
 * "Latest row per group" has no cheap form in the Prisma query API, so this is
 * one `DISTINCT ON` rather than N+1 per-vehicle queries. `DISTINCT ON` keeps
 * the first row of each partition, which the ORDER BY makes the newest.
 */
export const getLiveVehicles = cache(async (): Promise<LiveVehicle[]> => {
  const { orgId } = await requirePermission("vehicle:read");

  const rows = await prisma.$queryRaw<
    {
      id: string;
      plate: string;
      make: string | null;
      model: string | null;
      status: string;
      device_status: string | null;
      driver_name: string | null;
      lat: number;
      lng: number;
      speed: number | null;
      heading: number | null;
      ignition: boolean | null;
      ts: Date;
    }[]
  >`
    SELECT DISTINCT ON (v.id)
      v.id, v.plate, v.make, v.model, v.status::text AS status,
      d.status::text AS device_status,
      dr.name AS driver_name,
      p.lat, p.lng, p.speed, p.heading, p.ignition, p.ts
    FROM vehicles v
    JOIN positions p ON p."vehicleId" = v.id
    LEFT JOIN devices d ON d."vehicleId" = v.id
    LEFT JOIN drivers dr ON dr.id = v."driverId"
    WHERE v."orgId" = ${orgId}
    ORDER BY v.id, p.ts DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    plate: r.plate,
    label: [r.make, r.model].filter(Boolean).join(" ") || r.plate,
    status: r.status,
    deviceStatus: r.device_status,
    driverName: r.driver_name,
    lat: r.lat,
    lng: r.lng,
    speed: r.speed,
    heading: r.heading,
    ignition: r.ignition,
    ts: r.ts.toISOString(),
  }));
});

// --- Vehicles ---------------------------------------------------------------

export const getVehicles = cache(async () => {
  const { orgId } = await requirePermission("vehicle:read");

  const vehicles = await prisma.vehicle.findMany({
    where: { orgId },
    orderBy: { plate: "asc" },
    select: {
      id: true,
      plate: true,
      make: true,
      model: true,
      year: true,
      color: true,
      fuelType: true,
      status: true,
      odometer: true,
      driver: { select: { id: true, name: true } },
      device: { select: { id: true, imei: true, status: true, lastSeenAt: true } },
      _count: { select: { trips: true, alerts: true } },
    },
  });

  return vehicles.map((v) => ({ ...v, odometer: Number(v.odometer) }));
});

export const getVehicle = cache(async (id: string) => {
  const { orgId } = await requirePermission("vehicle:read");

  const vehicle = await prisma.vehicle.findFirst({
    // orgId sits in the filter, not just the id: an id guessed from another
    // tenant must read as "not found", never as someone else's vehicle.
    where: { id, orgId },
    select: {
      id: true,
      plate: true,
      make: true,
      model: true,
      year: true,
      vin: true,
      color: true,
      fuelType: true,
      status: true,
      odometer: true,
      notes: true,
      createdAt: true,
      driver: { select: { id: true, name: true } },
      device: {
        select: {
          id: true,
          imei: true,
          status: true,
          model: true,
          protocol: true,
          lastSeenAt: true,
        },
      },
      trips: {
        orderBy: { startTs: "desc" },
        take: 10,
        select: {
          id: true,
          startTs: true,
          endTs: true,
          distanceM: true,
          durationS: true,
          maxSpeed: true,
          status: true,
        },
      },
      maintenance: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          kind: true,
          status: true,
          title: true,
          dueAt: true,
          completedAt: true,
          costCents: true,
        },
      },
    },
  });

  if (!vehicle) return null;

  return { ...vehicle, odometer: Number(vehicle.odometer) };
});

/** The last 500 fixes for one vehicle, oldest first, ready to draw as a line. */
export const getVehicleTrack = cache(async (vehicleId: string) => {
  const { orgId } = await requirePermission("vehicle:read");

  const owned = await prisma.vehicle.findFirst({
    where: { id: vehicleId, orgId },
    select: { id: true },
  });
  if (!owned) return [];

  const points = await prisma.position.findMany({
    where: { vehicleId },
    orderBy: { ts: "desc" },
    take: 500,
    select: { lat: true, lng: true, ts: true, speed: true },
  });

  return points.reverse().map((p) => ({
    lat: p.lat,
    lng: p.lng,
    speed: p.speed,
    ts: p.ts.toISOString(),
  }));
});

// --- Drivers ----------------------------------------------------------------

export const getDrivers = cache(async () => {
  const { orgId } = await requirePermission("driver:read");

  return prisma.driver.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      licenseNumber: true,
      licenseExpiry: true,
      status: true,
      vehicles: { select: { id: true, plate: true } },
      _count: { select: { trips: true } },
    },
  });
});

// --- Trips ------------------------------------------------------------------

export const PAGE_SIZE = 25;

export type TripFilters = {
  vehicleId?: string;
  from?: Date;
  to?: Date;
  page?: number;
};

export const getTrips = cache(async (filters: TripFilters = {}) => {
  const { orgId } = await requirePermission("trip:read");

  const page = Math.max(1, filters.page ?? 1);
  const where = {
    orgId,
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.from || filters.to
      ? {
          startTs: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      orderBy: { startTs: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        startTs: true,
        endTs: true,
        startAddress: true,
        endAddress: true,
        distanceM: true,
        durationS: true,
        idleTimeS: true,
        maxSpeed: true,
        avgSpeed: true,
        status: true,
        vehicle: { select: { id: true, plate: true } },
        driver: { select: { id: true, name: true } },
      },
    }),
    prisma.trip.count({ where }),
  ]);

  return {
    trips,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
});

export const getTrip = cache(async (id: string) => {
  const { orgId } = await requirePermission("trip:read");

  const trip = await prisma.trip.findFirst({
    where: { id, orgId },
    select: {
      id: true,
      startTs: true,
      endTs: true,
      startLat: true,
      startLng: true,
      startAddress: true,
      endLat: true,
      endLng: true,
      endAddress: true,
      distanceM: true,
      durationS: true,
      idleTimeS: true,
      maxSpeed: true,
      avgSpeed: true,
      status: true,
      vehicle: { select: { id: true, plate: true, make: true, model: true } },
      driver: { select: { id: true, name: true } },
    },
  });

  if (!trip) return null;

  // The fixes that fall inside the trip window, so the detail page draws the
  // real route rather than a straight line between its two endpoints.
  const path = await prisma.position.findMany({
    where: {
      vehicleId: trip.vehicle.id,
      ts: { gte: trip.startTs, ...(trip.endTs ? { lte: trip.endTs } : {}) },
    },
    orderBy: { ts: "asc" },
    take: 1000,
    select: { lat: true, lng: true, ts: true, speed: true },
  });

  return {
    trip,
    path: path.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      ts: p.ts.toISOString(),
    })),
  };
});

// --- Geofences --------------------------------------------------------------

export const getGeofences = cache(async () => {
  const { orgId } = await requirePermission("geofence:read");

  const fences = await prisma.geofence.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      kind: true,
      centerLat: true,
      centerLng: true,
      radiusM: true,
      polygon: true,
      color: true,
      active: true,
      createdAt: true,
      _count: { select: { alerts: true } },
    },
  });

  // `polygon` is Json, which Prisma types as JsonValue. Narrow it here so the
  // map component receives a real [lat, lng][] or nothing at all.
  return fences.map((f) => ({
    ...f,
    polygon: Array.isArray(f.polygon) ? (f.polygon as unknown as number[][]) : null,
  }));
});

// --- Alerts -----------------------------------------------------------------

export type AlertFilters = {
  severity?: string;
  kind?: string;
  vehicleId?: string;
  unacknowledgedOnly?: boolean;
  page?: number;
};

export const getAlerts = cache(async (filters: AlertFilters = {}) => {
  const { orgId } = await requirePermission("alert:read");

  const page = Math.max(1, filters.page ?? 1);
  const where = {
    orgId,
    ...(filters.severity ? { severity: filters.severity as never } : {}),
    ...(filters.kind ? { kind: filters.kind as never } : {}),
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.unacknowledgedOnly ? { acknowledgedAt: null } : {}),
  };

  const [alerts, total, unacknowledged] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { ts: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        kind: true,
        severity: true,
        message: true,
        ts: true,
        lat: true,
        lng: true,
        readAt: true,
        acknowledgedAt: true,
        acknowledgedBy: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true } },
        geofence: { select: { id: true, name: true } },
      },
    }),
    prisma.alert.count({ where }),
    prisma.alert.count({ where: { orgId, acknowledgedAt: null } }),
  ]);

  return {
    alerts,
    total,
    unacknowledged,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
});

export const getAlertRules = cache(async () => {
  const { orgId } = await requirePermission("alert:read");

  return prisma.alertRule.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      kind: true,
      severity: true,
      active: true,
      channels: true,
      config: true,
      vehicleIds: true,
      _count: { select: { alerts: true } },
    },
  });
});

// --- Maintenance ------------------------------------------------------------

export const getMaintenanceRecords = cache(async () => {
  const { orgId } = await requirePermission("vehicle:read");

  const records = await prisma.maintenanceRecord.findMany({
    where: { orgId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    select: {
      id: true,
      kind: true,
      status: true,
      title: true,
      notes: true,
      vendor: true,
      dueAt: true,
      dueOdometer: true,
      completedAt: true,
      completedOdometer: true,
      costCents: true,
      vehicle: { select: { id: true, plate: true, odometer: true } },
    },
  });

  return records.map((r) => ({
    ...r,
    dueOdometer: r.dueOdometer === null ? null : Number(r.dueOdometer),
    completedOdometer:
      r.completedOdometer === null ? null : Number(r.completedOdometer),
    vehicle: { ...r.vehicle, odometer: Number(r.vehicle.odometer) },
  }));
});

// --- Reports ----------------------------------------------------------------

export const getReport = cache(async (days = 30) => {
  const { orgId } = await requirePermission("report:read");

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [perVehicle, perDay, alertsByKind, totals, vehicles] = await Promise.all([
    prisma.trip.groupBy({
      by: ["vehicleId"],
      where: { orgId, startTs: { gte: since } },
      _sum: { distanceM: true, durationS: true, idleTimeS: true },
      _count: { _all: true },
      _max: { maxSpeed: true },
    }),
    prisma.$queryRaw<{ day: Date; distance: bigint | null; trips: bigint }[]>`
      SELECT date_trunc('day', "startTs") AS day,
             SUM("distanceM")             AS distance,
             COUNT(*)                     AS trips
      FROM trips
      WHERE "orgId" = ${orgId} AND "startTs" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.alert.groupBy({
      by: ["kind"],
      where: { orgId, ts: { gte: since } },
      _count: { _all: true },
    }),
    prisma.trip.aggregate({
      where: { orgId, startTs: { gte: since } },
      _sum: { distanceM: true, durationS: true, idleTimeS: true },
      _count: { _all: true },
    }),
    prisma.vehicle.findMany({
      where: { orgId },
      select: { id: true, plate: true },
    }),
  ]);

  const plateOf = new Map(vehicles.map((v) => [v.id, v.plate]));

  return {
    days,
    totals: {
      trips: totals._count._all,
      distanceM: totals._sum.distanceM ?? 0,
      durationS: totals._sum.durationS ?? 0,
      idleTimeS: totals._sum.idleTimeS ?? 0,
    },
    perVehicle: perVehicle
      .map((row) => ({
        vehicleId: row.vehicleId,
        plate: plateOf.get(row.vehicleId) ?? "Unknown",
        trips: row._count._all,
        distanceM: row._sum.distanceM ?? 0,
        durationS: row._sum.durationS ?? 0,
        idleTimeS: row._sum.idleTimeS ?? 0,
        maxSpeed: row._max.maxSpeed ?? 0,
      }))
      .sort((a, b) => b.distanceM - a.distanceM),
    perDay: perDay.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      distanceM: Number(row.distance ?? 0),
      trips: Number(row.trips),
    })),
    alertsByKind: alertsByKind
      .map((row) => ({ kind: row.kind, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
  };
});

// --- Settings ---------------------------------------------------------------

export const getOrganization = cache(async () => {
  const { orgId } = await verifySession();

  return prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      createdAt: true,
      _count: { select: { users: true, vehicles: true, devices: true } },
    },
  });
});

export const getMembers = cache(async () => {
  const { orgId } = await requirePermission("user:manage");

  return prisma.user.findMany({
    where: { orgId },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      lastLoginAt: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });
});

export const getDevices = cache(async () => {
  const { orgId } = await requirePermission("device:read");

  return prisma.device.findMany({
    where: { orgId },
    orderBy: { imei: "asc" },
    select: {
      id: true,
      imei: true,
      simNumber: true,
      protocol: true,
      model: true,
      firmware: true,
      status: true,
      lastSeenAt: true,
      vehicle: { select: { id: true, plate: true } },
    },
  });
});
