/**
 * Display helpers shared by every fleet page.
 *
 * All of these are safe in both server and client components: none of them
 * reach for `Intl` defaults that differ between the two, and each takes an
 * explicit unit so a caller cannot mix metres up with kilometres.
 */

/** Metres to a short "12.4 km" / "840 m". */
export function formatDistance(metres: number | null | undefined): string {
  if (metres == null) return "—";
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Seconds to "2h 14m" / "8m 30s". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatSpeed(kph: number | null | undefined): string {
  if (kph == null) return "—";
  return `${Math.round(kph)} km/h`;
}

export function formatOdometer(metres: number | null | undefined): string {
  if (metres == null) return "—";
  return `${Math.round(metres / 1000).toLocaleString("en-US")} km`;
}

/** Minor units to "$1,240.00". Money is stored in cents, never as a float. */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/**
 * Fixed locale and UTC on purpose. A server-rendered timestamp formatted with
 * the machine's locale hydrates to different text in the browser, which React
 * reports as a hydration mismatch; pinning both ends that class of bug.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME.format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_ONLY.format(new Date(value));
}

/** "4 minutes ago" / "in 3 days", for freshness rather than precision. */
export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "never";

  const then = new Date(value).getTime();
  const deltaS = Math.round((then - Date.now()) / 1000);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];

  let value_ = deltaS;
  for (const [unit, size] of units) {
    if (Math.abs(value_) < size) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round(value_),
        unit,
      );
    }
    value_ = value_ / size;
  }

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    Math.round(value_),
    "year",
  );
}

/** ENUM_MEMBER -> "Enum member", for any of the schema's enums. */
export function humanizeEnum(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Degrees to the nearest compass point. */
export function formatHeading(degrees: number | null | undefined): string {
  if (degrees == null) return "—";
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(((degrees % 360) + 360) % 360 / 45) % 8];
}
