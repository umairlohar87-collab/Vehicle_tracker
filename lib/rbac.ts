import { Role } from "@/lib/generated/prisma/enums";

/**
 * Role ranks. DRIVER sits outside the management ladder: a driver can see their
 * own vehicle and trips but nothing else, so it ranks below VIEWER rather than
 * being a subset of it.
 */
const RANK: Record<Role, number> = {
  OWNER: 50,
  ADMIN: 40,
  MANAGER: 30,
  VIEWER: 20,
  DRIVER: 10,
};

export type Permission =
  | "org:manage"
  | "org:billing"
  | "user:invite"
  | "user:manage"
  | "vehicle:read"
  | "vehicle:write"
  | "device:read"
  | "device:write"
  | "driver:read"
  | "driver:write"
  | "trip:read"
  | "geofence:read"
  | "geofence:write"
  | "alert:read"
  | "alert:acknowledge"
  | "alert:configure"
  | "report:read";

/** The minimum role rank required for each permission. */
const REQUIRED: Record<Permission, Role> = {
  "org:manage": "OWNER",
  "org:billing": "OWNER",
  "user:invite": "ADMIN",
  "user:manage": "ADMIN",
  "vehicle:read": "VIEWER",
  "vehicle:write": "MANAGER",
  "device:read": "VIEWER",
  "device:write": "ADMIN",
  "driver:read": "VIEWER",
  "driver:write": "MANAGER",
  "trip:read": "VIEWER",
  "geofence:read": "VIEWER",
  "geofence:write": "MANAGER",
  "alert:read": "VIEWER",
  "alert:acknowledge": "MANAGER",
  "alert:configure": "MANAGER",
  "report:read": "VIEWER",
};

/** Permissions granted to DRIVER, which the rank ladder does not cover. */
const DRIVER_PERMISSIONS: ReadonlySet<Permission> = new Set([
  "vehicle:read",
  "trip:read",
  "alert:read",
]);

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "DRIVER") return DRIVER_PERMISSIONS.has(permission);
  return RANK[role] >= RANK[REQUIRED[permission]];
}

export function atLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  VIEWER: "Viewer",
  DRIVER: "Driver",
};
