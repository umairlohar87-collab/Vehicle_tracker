import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/tone";

/**
 * The headline figure card used on every summary strip in the app.
 *
 * A plain number counts up when it scrolls into view; anything already
 * formatted ("12.4 km", "$1,240.00") is printed as given, because animating a
 * pre-formatted string would mean re-parsing it. The stripe down the left edge
 * and the icon wash both take the card's tone, so a row of four reads as four
 * different measures at a glance.
 */
export function StatCard({
  label,
  value,
  icon,
  tone,
  prefix,
  suffix,
  decimals,
  hint,
  href,
  className,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  /** Omit inside a `data-tone` subtree to inherit that section's hue. */
  tone?: Tone;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  hint?: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <Card
      data-tone={tone}
      className={cn("lift h-full border-l-4 border-l-tone", className)}
    >
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon && <IconBadge icon={icon} size="sm" />}
          <span className="min-w-0 truncate">{label}</span>
        </div>
        <div className="font-heading text-h1 tabular-nums">
          {typeof value === "number" ? (
            <AnimatedNumber
              value={value}
              decimals={decimals}
              prefix={prefix}
              suffix={suffix}
            />
          ) : (
            <>
              {prefix}
              {value}
              {suffix}
            </>
          )}
        </div>
        {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block rounded-2xl">
      {body}
    </Link>
  );
}
