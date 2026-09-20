import { z } from "zod";

/**
 * Form schemas for every mutating page. Server actions parse `FormData`
 * through these before touching Prisma, so a hand-crafted POST gets the same
 * validation as the form does.
 */

/** "" (an untouched HTML input) should mean "not provided", not an empty string. */
const optionalText = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .nullable()
    .refine(
      (value) => value === null || (Number.isFinite(value) && value >= min && value <= max),
      { message: `Must be a number between ${min} and ${max}` },
    );

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : new Date(value)))
  .nullable()
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "Enter a valid date",
  });

// --- Vehicles ---------------------------------------------------------------

export const vehicleSchema = z.object({
  plate: z
    .string()
    .trim()
    .min(1, "Plate is required")
    .max(20, "Plate is too long")
    .toUpperCase(),
  make: optionalText(60),
  model: optionalText(60),
  year: optionalInt(1950, new Date().getFullYear() + 1),
  vin: optionalText(40),
  color: optionalText(40),
  fuelType: optionalText(40),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  driverId: optionalText(40),
  notes: optionalText(2000),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

// --- Drivers ----------------------------------------------------------------

export const driverSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .refine((value) => value === null || z.email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  phone: optionalText(30),
  licenseNumber: optionalText(40),
  licenseExpiry: optionalDate,
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export type DriverInput = z.infer<typeof driverSchema>;

// --- Geofences --------------------------------------------------------------

export const geofenceSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  centerLat: z.coerce
    .number<number>()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  centerLng: z.coerce
    .number<number>()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  radiusM: z.coerce
    .number<number>()
    .int()
    .min(25, "Radius must be at least 25 m")
    .max(100_000, "Radius must be under 100 km"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour")
    .default("#3b82f6"),
  active: z.coerce.boolean<boolean>().default(true),
});

export type GeofenceInput = z.infer<typeof geofenceSchema>;

// --- Maintenance ------------------------------------------------------------

export const maintenanceSchema = z.object({
  vehicleId: z.string().trim().min(1, "Pick a vehicle"),
  kind: z.enum(["SERVICE", "REPAIR", "INSPECTION", "TIRES", "OTHER"]),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  title: z.string().trim().min(2, "Describe the job").max(120),
  vendor: optionalText(80),
  notes: optionalText(2000),
  dueAt: optionalDate,
  // Entered in kilometres, stored in metres - see the action.
  dueOdometerKm: optionalInt(0, 5_000_000),
  costMajor: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .nullable()
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0), {
      message: "Enter a valid amount",
    }),
});

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

// --- Settings ---------------------------------------------------------------

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  timezone: z.string().trim().min(1).max(60),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
});

export const memberRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "VIEWER", "DRIVER"]),
});

// --- Devices ----------------------------------------------------------------

export const deviceSchema = z.object({
  imei: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "An IMEI is exactly 15 digits"),
  simNumber: optionalText(30),
  protocol: z.string().trim().min(1).max(40).default("teltonika"),
  model: optionalText(60),
  vehicleId: optionalText(40),
});

export type DeviceInput = z.infer<typeof deviceSchema>;
