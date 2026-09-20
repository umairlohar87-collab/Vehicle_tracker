"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import {
  deviceSchema,
  driverSchema,
  geofenceSchema,
  maintenanceSchema,
  memberRoleSchema,
  organizationSchema,
  profileSchema,
  vehicleSchema,
} from "@/lib/validations/fleet";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Turns a ZodError into the shape the forms render. */
function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): ActionState {
  return { fieldErrors: error.flatten().fieldErrors };
}

/**
 * Every mutation below re-derives orgId from the session and includes it in
 * the `where` of the update/delete. A row id arriving from the client is
 * therefore never enough on its own to touch another tenant's data.
 */

// --- Vehicles ---------------------------------------------------------------

export async function saveVehicle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId } = await requirePermission("vehicle:write");

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const id = formData.get("id");
  const { driverId, ...data } = parsed.data;

  // A driver id from the form must belong to this org before it can be linked.
  if (driverId) {
    const owned = await prisma.driver.findFirst({
      where: { id: driverId, orgId },
      select: { id: true },
    });
    if (!owned) return { fieldErrors: { driverId: ["Unknown driver"] } };
  }

  try {
    if (typeof id === "string" && id !== "") {
      const existing = await prisma.vehicle.findFirst({
        where: { id, orgId },
        select: { id: true },
      });
      if (!existing) return { error: "Vehicle not found." };

      await prisma.vehicle.update({
        where: { id },
        data: { ...data, driverId },
      });
    } else {
      await prisma.vehicle.create({ data: { ...data, driverId, orgId } });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { plate: ["That plate is already registered."] } };
    }
    throw error;
  }

  revalidatePath("/vehicles");
  revalidatePath("/map");
  return { ok: true };
}

export async function deleteVehicle(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("vehicle:write");
  const id = String(formData.get("id") ?? "");

  await prisma.vehicle.deleteMany({ where: { id, orgId } });

  revalidatePath("/vehicles");
  redirect("/vehicles");
}

// --- Drivers ----------------------------------------------------------------

export async function saveDriver(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId } = await requirePermission("driver:write");

  const parsed = driverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const id = formData.get("id");

  if (typeof id === "string" && id !== "") {
    const existing = await prisma.driver.findFirst({
      where: { id, orgId },
      select: { id: true },
    });
    if (!existing) return { error: "Driver not found." };

    await prisma.driver.update({ where: { id }, data: parsed.data });
  } else {
    await prisma.driver.create({ data: { ...parsed.data, orgId } });
  }

  revalidatePath("/drivers");
  return { ok: true };
}

export async function deleteDriver(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("driver:write");
  const id = String(formData.get("id") ?? "");

  await prisma.driver.deleteMany({ where: { id, orgId } });
  revalidatePath("/drivers");
}

// --- Geofences --------------------------------------------------------------

export async function saveGeofence(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId } = await requirePermission("geofence:write");

  const raw = Object.fromEntries(formData);
  // An unchecked checkbox sends nothing at all, which `coerce.boolean` would
  // read as undefined rather than false.
  const parsed = geofenceSchema.safeParse({ ...raw, active: raw.active === "on" });
  if (!parsed.success) return invalid(parsed.error);

  const id = formData.get("id");

  if (typeof id === "string" && id !== "") {
    const existing = await prisma.geofence.findFirst({
      where: { id, orgId },
      select: { id: true },
    });
    if (!existing) return { error: "Geofence not found." };

    await prisma.geofence.update({
      where: { id },
      data: { ...parsed.data, kind: "CIRCLE" },
    });
  } else {
    await prisma.geofence.create({
      data: { ...parsed.data, kind: "CIRCLE", orgId },
    });
  }

  revalidatePath("/geofences");
  revalidatePath("/map");
  return { ok: true };
}

export async function deleteGeofence(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("geofence:write");
  const id = String(formData.get("id") ?? "");

  await prisma.geofence.deleteMany({ where: { id, orgId } });
  revalidatePath("/geofences");
  revalidatePath("/map");
}

export async function toggleGeofence(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("geofence:write");
  const id = String(formData.get("id") ?? "");

  const fence = await prisma.geofence.findFirst({
    where: { id, orgId },
    select: { id: true, active: true },
  });
  if (!fence) return;

  await prisma.geofence.update({
    where: { id: fence.id },
    data: { active: !fence.active },
  });

  revalidatePath("/geofences");
  revalidatePath("/map");
}

// --- Alerts -----------------------------------------------------------------

export async function acknowledgeAlert(formData: FormData): Promise<void> {
  const { orgId, userId } = await requirePermission("alert:acknowledge");
  const id = String(formData.get("id") ?? "");

  // updateMany, not update: it takes the orgId filter, so an id from another
  // tenant matches nothing instead of throwing a "record not found" that would
  // confirm the row exists.
  await prisma.alert.updateMany({
    where: { id, orgId, acknowledgedAt: null },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
      readAt: new Date(),
    },
  });

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function acknowledgeAllAlerts(): Promise<void> {
  const { orgId, userId } = await requirePermission("alert:acknowledge");

  await prisma.alert.updateMany({
    where: { orgId, acknowledgedAt: null },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
      readAt: new Date(),
    },
  });

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function toggleAlertRule(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("alert:configure");
  const id = String(formData.get("id") ?? "");

  const rule = await prisma.alertRule.findFirst({
    where: { id, orgId },
    select: { id: true, active: true },
  });
  if (!rule) return;

  await prisma.alertRule.update({
    where: { id: rule.id },
    data: { active: !rule.active },
  });

  revalidatePath("/alerts");
}

// --- Maintenance ------------------------------------------------------------

export async function saveMaintenance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId } = await requirePermission("vehicle:write");

  const parsed = maintenanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const { vehicleId, dueOdometerKm, costMajor, ...rest } = parsed.data;

  const owned = await prisma.vehicle.findFirst({
    where: { id: vehicleId, orgId },
    select: { id: true },
  });
  if (!owned) return { fieldErrors: { vehicleId: ["Unknown vehicle"] } };

  const data = {
    ...rest,
    vehicleId,
    // The form collects kilometres and dollars; the column holds metres and
    // cents, so the conversion happens once, here.
    dueOdometer: dueOdometerKm === null ? null : BigInt(dueOdometerKm * 1000),
    costCents: costMajor === null ? null : Math.round(costMajor * 100),
    completedAt: rest.status === "COMPLETED" ? new Date() : null,
  };

  const id = formData.get("id");

  if (typeof id === "string" && id !== "") {
    const existing = await prisma.maintenanceRecord.findFirst({
      where: { id, orgId },
      select: { id: true, completedAt: true },
    });
    if (!existing) return { error: "Record not found." };

    await prisma.maintenanceRecord.update({
      where: { id },
      data: {
        ...data,
        // Keep the original completion time if it was already completed.
        completedAt:
          rest.status === "COMPLETED"
            ? (existing.completedAt ?? new Date())
            : null,
      },
    });
  } else {
    await prisma.maintenanceRecord.create({ data: { ...data, orgId } });
  }

  revalidatePath("/maintenance");
  return { ok: true };
}

export async function completeMaintenance(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("vehicle:write");
  const id = String(formData.get("id") ?? "");

  const record = await prisma.maintenanceRecord.findFirst({
    where: { id, orgId },
    select: { id: true, vehicle: { select: { odometer: true } } },
  });
  if (!record) return;

  await prisma.maintenanceRecord.update({
    where: { id: record.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedOdometer: record.vehicle.odometer,
    },
  });

  revalidatePath("/maintenance");
}

export async function deleteMaintenance(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("vehicle:write");
  const id = String(formData.get("id") ?? "");

  await prisma.maintenanceRecord.deleteMany({ where: { id, orgId } });
  revalidatePath("/maintenance");
}

// --- Devices ----------------------------------------------------------------

export async function saveDevice(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId } = await requirePermission("device:write");

  const parsed = deviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const { vehicleId, ...data } = parsed.data;

  if (vehicleId) {
    const owned = await prisma.vehicle.findFirst({
      where: { id: vehicleId, orgId },
      select: { id: true },
    });
    if (!owned) return { fieldErrors: { vehicleId: ["Unknown vehicle"] } };
  }

  const id = formData.get("id");

  try {
    if (typeof id === "string" && id !== "") {
      const existing = await prisma.device.findFirst({
        where: { id, orgId },
        select: { id: true },
      });
      if (!existing) return { error: "Device not found." };

      await prisma.device.update({
        where: { id },
        data: {
          ...data,
          vehicleId,
          status: vehicleId ? "OFFLINE" : "UNASSIGNED",
        },
      });
    } else {
      await prisma.device.create({
        data: {
          ...data,
          vehicleId,
          orgId,
          status: vehicleId ? "OFFLINE" : "UNASSIGNED",
        },
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: {
          imei: ["That IMEI is already registered, possibly to another fleet."],
        },
      };
    }
    throw error;
  }

  revalidatePath("/settings");
  revalidatePath("/vehicles");
  return { ok: true };
}

export async function deleteDevice(formData: FormData): Promise<void> {
  const { orgId } = await requirePermission("device:write");
  const id = String(formData.get("id") ?? "");

  await prisma.device.deleteMany({ where: { id, orgId } });
  revalidatePath("/settings");
}

// --- Settings ---------------------------------------------------------------

export async function updateOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId } = await requirePermission("org:manage");

  const parsed = organizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  await prisma.organization.update({ where: { id: orgId }, data: parsed.data });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requirePermission("vehicle:read");

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  await prisma.user.update({ where: { id: userId }, data: parsed.data });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateMemberRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { orgId, userId } = await requirePermission("user:manage");

  const parsed = memberRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  if (parsed.data.userId === userId) {
    return { error: "You cannot change your own role." };
  }

  const member = await prisma.user.findFirst({
    where: { id: parsed.data.userId, orgId },
    select: { id: true, role: true },
  });
  if (!member) return { error: "Member not found." };

  // Demoting the last owner would leave the org with nobody who can manage it.
  if (member.role === "OWNER" && parsed.data.role !== "OWNER") {
    const owners = await prisma.user.count({ where: { orgId, role: "OWNER" } });
    if (owners <= 1) {
      return { error: "An organization must keep at least one owner." };
    }
  }

  await prisma.user.update({
    where: { id: member.id },
    data: { role: parsed.data.role },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMember(formData: FormData): Promise<void> {
  const { orgId, userId } = await requirePermission("user:manage");
  const id = String(formData.get("id") ?? "");

  if (id === userId) return;

  const member = await prisma.user.findFirst({
    where: { id, orgId },
    select: { id: true, role: true },
  });
  if (!member) return;

  if (member.role === "OWNER") {
    const owners = await prisma.user.count({ where: { orgId, role: "OWNER" } });
    if (owners <= 1) return;
  }

  await prisma.user.delete({ where: { id: member.id } });
  revalidatePath("/settings");
}

// --- Shared -----------------------------------------------------------------

/** Prisma's unique-constraint code, without importing the error class. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
