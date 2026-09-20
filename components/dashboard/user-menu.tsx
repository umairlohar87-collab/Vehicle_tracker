"use client";

import { LogOut } from "lucide-react";

import { logout } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,      // ← added
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({
  name,
  email,
  image,
  role,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <Avatar className="size-8 ring-1 ring-border">
          {image ? <AvatarImage src={image} alt="" /> : null}
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Account menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="truncate text-sm font-medium">{name ?? email}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
            <Badge variant="secondary" className="mt-1 w-fit">
              {ROLE_LABELS[role]}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <form action={logout}>
          <DropdownMenuItem
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}