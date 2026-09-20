import Link from "next/link";
import { Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { optionalSession } from "@/lib/dal";

export default async function Home() {
  const session = await optionalSession();

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 px-6 text-center">
      {/* Two soft colour fields behind the hero, one per end of the brand
          gradient, so the page is not a white sheet with a logo on it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 size-[28rem] rounded-full bg-expense/10 blur-3xl" />
      </div>

      <IconBadge icon={Navigation} variant="gradient" size="lg" />

      <div className="max-w-md">
        <h1 className="text-display text-gradient">Vehicle Tracker</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Live GPS tracking, trip history, geofencing and alerts for your fleet.
        </p>
      </div>

      <div className="flex gap-3">
        {session ? (
          <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
            Go to dashboard
          </Button>
        ) : (
          <>
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Get started
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
