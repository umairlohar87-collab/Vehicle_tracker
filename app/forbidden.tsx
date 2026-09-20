import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldX className="size-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          You do not have access to this page
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an owner or admin in your organization to change your role.
        </p>
      </div>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        Back to dashboard
      </Button>
    </div>
  );
}
