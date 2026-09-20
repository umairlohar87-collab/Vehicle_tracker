import Link from "next/link";
import { Navigation } from "lucide-react";

import { IconBadge } from "@/components/ui/icon-badge";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-muted/30"
      >
        <div className="absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-brand/12 blur-3xl" />
        <div className="absolute -bottom-48 right-1/4 size-[26rem] rounded-full bg-expense/10 blur-3xl" />
      </div>

      <Link
        href="/"
        className="mb-8 flex items-center gap-2.5 font-heading text-h3"
      >
        <IconBadge icon={Navigation} variant="gradient" />
        Vehicle Tracker
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
