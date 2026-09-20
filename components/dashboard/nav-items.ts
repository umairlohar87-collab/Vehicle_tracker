import {
  BellRing,
  Car,
  CircleUser,
  FileBarChart,
  LayoutDashboard,
  Map,
  MapPinned,
  Route,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/rbac";
import type { Tone } from "@/lib/tone";

/**
 * One record per section of the app, and the single source of truth for what
 * each section looks like: its label, its icon, and the hue that identifies it
 * in the sidebar, its page header and every stat card on it. A page names its
 * module key rather than repeating an icon and a colour.
 */
export const MODULES = {
  overview: {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    tone: "brand",
  },
  map: { href: "/map", label: "Live map", icon: Map, tone: "sky" },
  vehicles: { href: "/vehicles", label: "Vehicles", icon: Car, tone: "indigo" },
  trips: { href: "/trips", label: "Trips", icon: Route, tone: "violet" },
  geofences: {
    href: "/geofences",
    label: "Geofences",
    icon: MapPinned,
    tone: "emerald",
  },
  alerts: { href: "/alerts", label: "Alerts", icon: BellRing, tone: "rose" },
  drivers: {
    href: "/drivers",
    label: "Drivers",
    icon: CircleUser,
    tone: "teal",
  },
  maintenance: {
    href: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    tone: "amber",
  },
  reports: {
    href: "/reports",
    label: "Reports",
    icon: FileBarChart,
    tone: "orange",
  },
  settings: {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    tone: "slate",
  },
} as const satisfies Record<
  string,
  { href: string; label: string; icon: LucideIcon; tone: Tone }
>;

export type ModuleKey = keyof typeof MODULES;

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  /** Hidden from the sidebar unless the role holds this permission. */
  permission: Permission;
  /**
   * Whether the route actually exists yet. Every page in the list is now
   * built, so all of them are ready - the flag stays so a future nav entry can
   * be added here before its route exists without 404ing the sidebar.
   */
  ready?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { ...MODULES.overview, permission: "vehicle:read", ready: true },
  { ...MODULES.map, permission: "vehicle:read", ready: true },
  { ...MODULES.vehicles, permission: "vehicle:read", ready: true },
  { ...MODULES.trips, permission: "trip:read", ready: true },
  { ...MODULES.geofences, permission: "geofence:read", ready: true },
  { ...MODULES.alerts, permission: "alert:read", ready: true },
  { ...MODULES.drivers, permission: "driver:read", ready: true },
  { ...MODULES.maintenance, permission: "vehicle:write", ready: true },
  { ...MODULES.reports, permission: "report:read", ready: true },
  { ...MODULES.settings, permission: "user:manage", ready: true },
];

/** The links the sidebar may show: built routes only. */
export const READY_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.ready);

/**
 * What the phone-sized bottom bar carries. Five is the most that stays above
 * a 44px tap target on a small screen; the rest live behind the menu sheet.
 */
export const BOTTOM_NAV_KEYS = [
  "overview",
  "map",
  "vehicles",
  "trips",
  "alerts",
] as const satisfies readonly ModuleKey[];
