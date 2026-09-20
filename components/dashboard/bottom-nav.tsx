"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BOTTOM_NAV_KEYS,
  MODULES,
  READY_NAV_ITEMS,
  type NavItem,
} from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

type Ripple = { id: number; x: number; y: number };

/**
 * The phone-sized navigation bar: five destinations pinned to the bottom of
 * the viewport behind a frosted panel, with the rest still reachable from the
 * menu sheet in the top bar.
 *
 * Like the sidebar, this only hides links - lib/dal.ts is what actually
 * enforces access to each route.
 */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const items = BOTTOM_NAV_KEYS.map((key) =>
    READY_NAV_ITEMS.find((item) => item.href === MODULES[key].href),
  ).filter(
    (item): item is NavItem => item != null && hasPermission(role, item.permission),
  );

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => (
          <li key={item.href} className="flex-1">
            <NavTab
              item={item}
              active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon, tone } = item;
  const [ripples, setRipples] = useState<Ripple[]>([]);

  return (
    <Link
      href={href}
      data-tone={tone}
      aria-current={active ? "page" : undefined}
      onPointerDown={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setRipples((current) => [
          ...current,
          {
            id: event.timeStamp + Math.random(),
            x: event.clientX - box.left,
            y: event.clientY - box.top,
          },
        ]);
      }}
      className={cn(
        // 56px tall: comfortably past the 44px minimum tap target.
        "relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 py-2 text-caption transition-colors",
        active ? "text-tone-ink" : "text-muted-foreground",
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            style={{ left: ripple.x, top: ripple.y }}
            onAnimationEnd={() =>
              setRipples((current) => current.filter((r) => r.id !== ripple.id))
            }
            className="absolute size-16 -translate-x-1/2 -translate-y-1/2 animate-tap-ripple rounded-full bg-tone opacity-0"
          />
        ))}
      </span>

      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-xl transition-colors",
          active && "bg-tone/12",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
