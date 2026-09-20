import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/tone";

const SIZES = {
  sm: "size-7 rounded-lg [&>svg]:size-3.5",
  md: "size-9 rounded-xl [&>svg]:size-4.5",
  lg: "size-11 rounded-2xl [&>svg]:size-5",
} as const;

/**
 * The colour-coded square every module is recognised by - orange on
 * Reports, rose on Alerts, amber on Maintenance and so on.
 *
 * `soft` is the default and the only one used next to text: a wash of the tone
 * behind an `-ink` glyph, which keeps the icon readable in both themes. The
 * `gradient` variant is for the brand mark itself, where the icon is white on
 * a saturated blue-to-violet fill.
 */
export function IconBadge({
  icon: Icon,
  tone,
  size = "md",
  variant = "soft",
  className,
}: {
  icon: LucideIcon;
  /** Omit inside a `data-tone` subtree to inherit that section's hue. */
  tone?: Tone;
  size?: keyof typeof SIZES;
  variant?: "soft" | "gradient";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-tone={tone}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        SIZES[size],
        variant === "gradient"
          ? "bg-(image:--gradient-primary) text-white shadow-sm"
          : "bg-tone/12 text-tone-ink ring-1 ring-tone/20 ring-inset",
        className,
      )}
    >
      <Icon />
    </span>
  );
}
