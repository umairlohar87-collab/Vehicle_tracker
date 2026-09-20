"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navigation } from "lucide-react";

import { READY_NAV_ITEMS } from "@/components/dashboard/nav-items";
import { IconBadge } from "@/components/ui/icon-badge";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

export function SidebarNav({
  role,
  orgName,
  onNavigate,
}: {
  role: Role;
  orgName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // The sidebar only hides links. lib/dal.ts still enforces access per route.
  const items = READY_NAV_ITEMS.filter((item) =>
    hasPermission(role, item.permission),
  );

  return (
    <div className="flex h-full flex-col gap-5 p-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5"
      >
        <IconBadge icon={Navigation} variant="gradient" />
        <span className="min-w-0">
          <span className="block truncate font-heading text-h4">
            Vehicle Tracker
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {orgName}
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon, tone }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              data-tone={tone}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group/nav relative flex items-center gap-2.5 rounded-xl py-1.5 pr-2.5 pl-2 text-sm transition-colors",
                active
                  ? "bg-tone/10 font-medium text-tone-ink"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {/* The hue only shows on the active row, which is what makes the
                  sidebar readable at a glance without ten coloured icons. */}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 -left-1 w-1 rounded-full bg-tone"
                />
              )}
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active && "bg-tone/15",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
