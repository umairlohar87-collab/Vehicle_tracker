import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { MODULES, type ModuleKey } from "@/components/dashboard/nav-items";
import { IconBadge } from "@/components/ui/icon-badge";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/tone";

/**
 * The banner every section opens with: the module's icon badge, its title, and
 * a wash of its hue fading off to the right.
 *
 * Passing `module` is the usual way to use it - the icon and the tone come
 * from the nav registry, so a section cannot drift into a different colour on
 * its detail pages than it has in the sidebar. Detail pages name their parent
 * module ("/vehicles/[id]" passes `vehicles`) for exactly that reason.
 */
export function PageHeader({
  module,
  title,
  description,
  action,
  icon,
  tone,
}: {
  module?: ModuleKey;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Overrides the module's icon; pass `null` to show none. */
  icon?: LucideIcon | null;
  /** Overrides the module's hue. */
  tone?: Tone;
}) {
  const source = module ? MODULES[module] : undefined;
  const Icon = icon === null ? null : (icon ?? source?.icon);
  const resolvedTone = tone ?? source?.tone;

  return (
    <div
      data-tone={resolvedTone}
      className="tone-wash relative overflow-hidden rounded-2xl border px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && <IconBadge icon={Icon} size="lg" />}
          <div className="min-w-0">
            <h1 className="text-h1">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className="relative flex size-16 items-center justify-center rounded-3xl bg-tone/10 text-tone-ink ring-1 ring-tone/20 ring-inset"
        >
          {/* A second, wider ring reads as a halo and keeps the mark from
              looking like a disabled button. */}
          <span className="absolute -inset-3 rounded-[1.75rem] ring-1 ring-tone/10" />
          <Icon className="size-7" />
        </span>
      )}
      <div>
        <p className="font-heading text-h4">{title}</p>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Key/value rows used by the vehicle and trip detail panels. */
export function DetailList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-caption text-muted-foreground">{item.label}</dt>
          <dd className="truncate text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
