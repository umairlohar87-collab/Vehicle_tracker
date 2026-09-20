/**
 * Development seed.
 *
 * Builds one organization with a full 30 days of history behind it - drivers,
 * vehicles, devices, position fixes, trips, geofences, alert rules, alerts and
 * maintenance jobs - so every page in the app has something real to render.
 *
 *   npx prisma db seed
 *
 * Safe to re-run: everything is keyed on a natural key and upserted, and the
 * generated history is deleted for this org before being rebuilt, so repeated
 * runs do not stack duplicate trips on top of each other.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../lib/generated/prisma/client";
import type { Role } from "../lib/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PASSWORD = "Password123!";
const DAYS = 30;

/**
 * A seeded PRNG rather than Math.random: a re-seed then produces the same
 * fleet, so a screenshot or a bug report still lines up with the data.
 */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const random = makeRandom(20260920);

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => min + random() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));

// Central London, which gives the map recognisable streets to sit on.
const BASE_LAT = 51.5074;
const BASE_LNG = -0.1278;

const USERS: { email: string; name: string; role: Role }[] = [
  { email: "owner@demo.test", name: "Olivia Owner", role: "OWNER" },
  { email: "admin@demo.test", name: "Adam Admin", role: "ADMIN" },
  { email: "manager@demo.test", name: "Maya Manager", role: "MANAGER" },
  { email: "viewer@demo.test", name: "Victor Viewer", role: "VIEWER" },
];

const DRIVERS = [
  { name: "Sam Okafor", email: "sam@demo.test", phone: "+44 7700 900101", licenseNumber: "OKAFO751103SM9AB" },
  { name: "Priya Raman", email: "priya@demo.test", phone: "+44 7700 900102", licenseNumber: "RAMAN802255PR7CD" },
  { name: "Tom Hedlund", email: "tom@demo.test", phone: "+44 7700 900103", licenseNumber: "HEDLU690417TH2EF" },
  { name: "Leila Haddad", email: "leila@demo.test", phone: "+44 7700 900104", licenseNumber: "HADDA880930LH5GH" },
];

const VEHICLES = [
  { plate: "FLEET-001", make: "Toyota", model: "Hilux", year: 2022, color: "White", fuelType: "Diesel", imei: "350424060000001" },
  { plate: "FLEET-002", make: "Ford", model: "Transit", year: 2021, color: "Silver", fuelType: "Diesel", imei: "350424060000002" },
  { plate: "FLEET-003", make: "Mercedes-Benz", model: "Sprinter", year: 2023, color: "White", fuelType: "Diesel", imei: "350424060000003" },
  { plate: "FLEET-004", make: "Volkswagen", model: "Caddy", year: 2020, color: "Blue", fuelType: "Petrol", imei: "350424060000004" },
  { plate: "FLEET-005", make: "Renault", model: "Kangoo E-Tech", year: 2024, color: "Green", fuelType: "Electric", imei: "350424060000005" },
  { plate: "FLEET-006", make: "Isuzu", model: "D-Max", year: 2019, color: "Grey", fuelType: "Diesel", imei: "350424060000006" },
];

const GEOFENCES = [
  { name: "Main depot", lat: 51.5142, lng: -0.0931, radiusM: 600, color: "#2a78d6" },
  { name: "North distribution hub", lat: 51.5461, lng: -0.1055, radiusM: 900, color: "#1baf7a" },
  { name: "Airport zone", lat: 51.4700, lng: -0.4543, radiusM: 2500, color: "#eda100" },
  { name: "Restricted - city centre", lat: 51.5122, lng: -0.1215, radiusM: 750, color: "#e34948" },
];

const PLACES = [
  "Main depot", "Canary Wharf", "Stratford", "Camden", "Croydon depot",
  "Heathrow cargo", "Wembley", "Greenwich", "Hackney Wick", "Brixton",
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const org = await prisma.organization.upsert({
    where: { slug: "demo-fleet" },
    update: {},
    create: { name: "Demo Fleet", slug: "demo-fleet", timezone: "Europe/London" },
  });

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, orgId: org.id },
      create: { ...user, passwordHash, orgId: org.id },
    });
  }

  // Generated history is rebuilt from scratch; the fleet itself is upserted.
  // Positions and trips cascade from their vehicle, so they are cleared by
  // orgId directly rather than by deleting the vehicles.
  await prisma.alert.deleteMany({ where: { orgId: org.id } });
  await prisma.trip.deleteMany({ where: { orgId: org.id } });
  await prisma.maintenanceRecord.deleteMany({ where: { orgId: org.id } });
  await prisma.position.deleteMany({ where: { vehicle: { orgId: org.id } } });

  const drivers = [];
  for (const driver of DRIVERS) {
    drivers.push(
      await prisma.driver.upsert({
        // Drivers have no natural unique key in the schema, so match on the
        // org + name pair that the seed itself controls.
        where: {
          id:
            (
              await prisma.driver.findFirst({
                where: { orgId: org.id, name: driver.name },
                select: { id: true },
              })
            )?.id ?? "seed-placeholder",
        },
        update: { ...driver, status: "ACTIVE" },
        create: {
          ...driver,
          orgId: org.id,
          status: "ACTIVE",
          licenseExpiry: new Date(
            Date.now() + intBetween(-20, 500) * 86_400_000,
          ),
        },
      }),
    );
  }

  const geofences = [];
  for (const fence of GEOFENCES) {
    const existing = await prisma.geofence.findFirst({
      where: { orgId: org.id, name: fence.name },
      select: { id: true },
    });

    geofences.push(
      existing
        ? await prisma.geofence.update({
            where: { id: existing.id },
            data: {
              centerLat: fence.lat,
              centerLng: fence.lng,
              radiusM: fence.radiusM,
              color: fence.color,
            },
          })
        : await prisma.geofence.create({
            data: {
              orgId: org.id,
              name: fence.name,
              kind: "CIRCLE",
              centerLat: fence.lat,
              centerLng: fence.lng,
              radiusM: fence.radiusM,
              color: fence.color,
              active: true,
            },
          }),
    );
  }

  const now = Date.now();
  const vehicles = [];

  for (const [index, spec] of VEHICLES.entries()) {
    const { imei, ...vehicle } = spec;
    const driver = drivers[index % drivers.length];

    const record = await prisma.vehicle.upsert({
      where: { orgId_plate: { orgId: org.id, plate: vehicle.plate } },
      update: { ...vehicle, driverId: driver.id },
      create: {
        ...vehicle,
        orgId: org.id,
        driverId: driver.id,
        odometer: BigInt(intBetween(20_000, 240_000) * 1000),
        status: index === 5 ? "MAINTENANCE" : "ACTIVE",
      },
    });

    await prisma.device.upsert({
      where: { imei },
      update: {
        vehicleId: record.id,
        status: index === 4 ? "OFFLINE" : "ONLINE",
        lastSeenAt: new Date(now - intBetween(1, 90) * 60_000),
      },
      create: {
        imei,
        orgId: org.id,
        vehicleId: record.id,
        protocol: "teltonika",
        model: pick(["FMB920", "FMC130", "FMB130"]),
        firmware: "03.27.07",
        simNumber: `8944${intBetween(100000000, 999999999)}`,
        status: index === 4 ? "OFFLINE" : "ONLINE",
        lastSeenAt: new Date(now - intBetween(1, 90) * 60_000),
      },
    });

    vehicles.push({ ...record, driverId: driver.id });
  }

  // --- Trips and the position fixes underneath them -------------------------

  type PositionRow = {
    deviceId: string;
    vehicleId: string;
    ts: Date;
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    ignition: boolean;
    satellites: number;
  };

  const positions: PositionRow[] = [];
  const alerts: {
    orgId: string;
    vehicleId: string;
    geofenceId?: string;
    kind: string;
    severity: string;
    message: string;
    ts: Date;
    lat: number;
    lng: number;
    acknowledgedAt: Date | null;
  }[] = [];

  for (const vehicle of vehicles) {
    const device = await prisma.device.findFirst({
      where: { vehicleId: vehicle.id },
      select: { id: true },
    });
    if (!device) continue;

    let odometerM = Number(vehicle.odometer);

    for (let day = DAYS - 1; day >= 0; day--) {
      // Weekends run a lighter schedule, which makes the trend chart read like
      // a real fleet rather than noise.
      const date = new Date(now - day * 86_400_000);
      const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
      const tripCount = weekend ? intBetween(0, 1) : intBetween(1, 3);

      for (let t = 0; t < tripCount; t++) {
        const startHour = 7 + t * 4 + between(0, 1.5);
        const startTs = new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            Math.floor(startHour),
            Math.floor((startHour % 1) * 60),
          ),
        );

        const fixes = intBetween(24, 60);
        const stepS = intBetween(45, 90);
        const durationS = fixes * stepS;
        const endTs = new Date(startTs.getTime() + durationS * 1000);

        // A trip that would end in the future is still running.
        const inProgress = endTs.getTime() > now;
        if (startTs.getTime() > now) continue;

        let lat = BASE_LAT + between(-0.06, 0.06);
        let lng = BASE_LNG + between(-0.09, 0.09);
        let heading = between(0, 360);
        let distanceM = 0;
        let maxSpeed = 0;
        let idleS = 0;

        const startLat = lat;
        const startLng = lng;

        for (let i = 0; i < fixes; i++) {
          const ts = new Date(startTs.getTime() + i * stepS * 1000);
          if (ts.getTime() > now) break;

          // Occasional stops: speed drops to zero and the fix stops moving.
          const idling = random() < 0.12;
          const speed = idling ? 0 : between(12, 78);
          if (idling) idleS += stepS;

          heading = (heading + between(-25, 25) + 360) % 360;

          const metres = (speed * 1000 * stepS) / 3600;
          distanceM += metres;
          maxSpeed = Math.max(maxSpeed, speed);

          // Convert the step into degrees: latitude is ~111 km per degree, and
          // longitude shrinks by cos(lat) as you move away from the equator.
          const rad = (heading * Math.PI) / 180;
          lat += (metres * Math.cos(rad)) / 111_000;
          lng +=
            (metres * Math.sin(rad)) /
            (111_000 * Math.cos((lat * Math.PI) / 180));

          positions.push({
            deviceId: device.id,
            vehicleId: vehicle.id,
            ts,
            lat,
            lng,
            speed,
            heading,
            ignition: true,
            satellites: intBetween(6, 14),
          });

          if (speed > 70 && random() < 0.35) {
            alerts.push({
              orgId: org.id,
              vehicleId: vehicle.id,
              kind: "SPEEDING",
              severity: speed > 76 ? "CRITICAL" : "WARNING",
              message: `${vehicle.plate} reached ${Math.round(speed)} km/h in a 60 km/h zone`,
              ts,
              lat,
              lng,
              acknowledgedAt: random() < 0.5 ? new Date(ts.getTime() + 600_000) : null,
            });
          }
        }

        odometerM += distanceM;

        const from = pick(PLACES);
        let to = pick(PLACES);
        while (to === from) to = pick(PLACES);

        await prisma.trip.create({
          data: {
            orgId: org.id,
            vehicleId: vehicle.id,
            driverId: vehicle.driverId,
            startTs,
            endTs: inProgress ? null : endTs,
            startLat,
            startLng,
            startAddress: from,
            endLat: lat,
            endLng: lng,
            endAddress: inProgress ? null : to,
            distanceM: Math.round(distanceM),
            durationS,
            idleTimeS: idleS,
            maxSpeed,
            avgSpeed: distanceM / 1000 / (durationS / 3600),
            status: inProgress ? "IN_PROGRESS" : "COMPLETED",
          },
        });

        // A handful of non-speed events, spread across the fleet.
        if (random() < 0.18) {
          const fence = pick(geofences);
          alerts.push({
            orgId: org.id,
            vehicleId: vehicle.id,
            geofenceId: fence.id,
            kind: random() < 0.5 ? "GEOFENCE_ENTER" : "GEOFENCE_EXIT",
            severity: "INFO",
            message: `${vehicle.plate} crossed "${fence.name}"`,
            ts: new Date(startTs.getTime() + 120_000),
            lat: fence.centerLat ?? BASE_LAT,
            lng: fence.centerLng ?? BASE_LNG,
            acknowledgedAt: random() < 0.6 ? new Date(endTs) : null,
          });
        }

        if (idleS > 600 && random() < 0.3) {
          alerts.push({
            orgId: org.id,
            vehicleId: vehicle.id,
            kind: "EXCESSIVE_IDLE",
            severity: "WARNING",
            message: `${vehicle.plate} idled for ${Math.round(idleS / 60)} minutes`,
            ts: endTs,
            lat,
            lng,
            acknowledgedAt: null,
          });
        }

        if (random() < 0.05) {
          alerts.push({
            orgId: org.id,
            vehicleId: vehicle.id,
            kind: pick(["HARSH_BRAKING", "HARSH_ACCELERATION"]),
            severity: "WARNING",
            message: `${vehicle.plate} recorded a harsh manoeuvre`,
            ts: new Date(startTs.getTime() + 300_000),
            lat,
            lng,
            acknowledgedAt: null,
          });
        }
      }
    }

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { odometer: BigInt(Math.round(odometerM)) },
    });
  }

  // A few device-level alerts that are not tied to a trip.
  alerts.push({
    orgId: org.id,
    vehicleId: vehicles[4].id,
    kind: "DEVICE_OFFLINE",
    severity: "CRITICAL",
    message: `${vehicles[4].plate} has not reported for over 6 hours`,
    ts: new Date(now - 3 * 3_600_000),
    lat: BASE_LAT,
    lng: BASE_LNG,
    acknowledgedAt: null,
  });
  alerts.push({
    orgId: org.id,
    vehicleId: vehicles[1].id,
    kind: "LOW_BATTERY",
    severity: "WARNING",
    message: `${vehicles[1].plate} backup battery at 18%`,
    ts: new Date(now - 9 * 3_600_000),
    lat: BASE_LAT,
    lng: BASE_LNG,
    acknowledgedAt: null,
  });

  // Postgres has a parameter cap per statement, so the fixes go in chunks.
  const CHUNK = 2000;
  for (let i = 0; i < positions.length; i += CHUNK) {
    await prisma.position.createMany({ data: positions.slice(i, i + CHUNK) });
  }

  for (let i = 0; i < alerts.length; i += CHUNK) {
    await prisma.alert.createMany({
      data: alerts.slice(i, i + CHUNK) as never,
    });
  }

  // --- Alert rules ----------------------------------------------------------

  const RULES = [
    { name: "Speeding over 60 km/h", kind: "SPEEDING", severity: "WARNING", config: { limitKph: 60 } },
    { name: "Excessive idling", kind: "EXCESSIVE_IDLE", severity: "WARNING", config: { minutes: 10 } },
    { name: "Depot entry & exit", kind: "GEOFENCE_ENTER", severity: "INFO", config: {} },
    { name: "Harsh braking", kind: "HARSH_BRAKING", severity: "WARNING", config: { gForce: 0.4 } },
    { name: "Device offline", kind: "DEVICE_OFFLINE", severity: "CRITICAL", config: { hours: 6 } },
    { name: "SOS button", kind: "SOS", severity: "CRITICAL", config: {} },
  ] as const;

  for (const rule of RULES) {
    const existing = await prisma.alertRule.findFirst({
      where: { orgId: org.id, name: rule.name },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.alertRule.create({
      data: {
        orgId: org.id,
        name: rule.name,
        kind: rule.kind,
        severity: rule.severity,
        config: rule.config,
        channels: rule.severity === "CRITICAL" ? ["EMAIL", "PUSH"] : ["EMAIL"],
        active: true,
      },
    });
  }

  // --- Maintenance ----------------------------------------------------------

  const JOBS = [
    { kind: "SERVICE", title: "Annual service", vendor: "CityFleet Garage", dayOffset: 12, cost: 48000 },
    { kind: "TIRES", title: "Replace front tyres", vendor: "TyreHub", dayOffset: -4, cost: 32000 },
    { kind: "INSPECTION", title: "MOT inspection", vendor: "DVSA approved", dayOffset: 26, cost: 5500 },
    { kind: "REPAIR", title: "Replace brake discs", vendor: "CityFleet Garage", dayOffset: -11, cost: 61000 },
    { kind: "SERVICE", title: "Oil and filter change", vendor: "QuickLube", dayOffset: 5, cost: 14000 },
    { kind: "OTHER", title: "Recalibrate tracker", vendor: "Teltonika partner", dayOffset: 40, cost: 9000 },
  ] as const;

  for (const [index, job] of JOBS.entries()) {
    const vehicle = vehicles[index % vehicles.length];
    // A job dated in the past is either done or overdue; one dated ahead is
    // still scheduled. That spread is what makes the page's badges meaningful.
    const completed = job.dayOffset < 0 && index % 2 === 1;

    await prisma.maintenanceRecord.create({
      data: {
        orgId: org.id,
        vehicleId: vehicle.id,
        kind: job.kind,
        status: completed ? "COMPLETED" : "SCHEDULED",
        title: job.title,
        vendor: job.vendor,
        dueAt: new Date(now + job.dayOffset * 86_400_000),
        dueOdometer: BigInt(Math.round(Number(vehicle.odometer) + 5_000_000)),
        completedAt: completed
          ? new Date(now + job.dayOffset * 86_400_000)
          : null,
        costCents: job.cost,
      },
    });
  }

  const [tripCount, alertCount] = await Promise.all([
    prisma.trip.count({ where: { orgId: org.id } }),
    prisma.alert.count({ where: { orgId: org.id } }),
  ]);

  console.log(`Seeded "${org.name}":`);
  console.log(
    `  ${vehicles.length} vehicles, ${drivers.length} drivers, ${geofences.length} geofences`,
  );
  console.log(
    `  ${positions.length} positions, ${tripCount} trips, ${alertCount} alerts`,
  );
  console.log(`\nSign in as any of: ${USERS.map((u) => u.email).join(", ")}`);
  console.log(`Password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
