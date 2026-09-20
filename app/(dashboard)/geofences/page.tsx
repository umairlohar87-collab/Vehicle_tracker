import type { Metadata } from "next";
import { MapPinned } from "lucide-react";

import { deleteGeofence, toggleGeofence } from "@/app/(dashboard)/actions";
import { GeofenceForm } from "@/app/(dashboard)/geofences/geofence-form";
import { MapView } from "@/components/map/map-view";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGeofences, verifySession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Geofences",
};

export default async function GeofencesPage() {
  const session = await verifySession();
  const canWrite = hasPermission(session.role, "geofence:write");
  const fences = await getGeofences();

  const mapFences = fences.map((f) => ({
    id: f.id,
    name: f.name,
    centerLat: f.centerLat,
    centerLng: f.centerLng,
    radiusM: f.radiusM,
    color: f.color,
    active: f.active,
  }));

  return (
    <div data-tone="emerald" className="flex flex-col gap-4">
      <PageHeader
        module="geofences"
        title="Geofences"
        description={`${fences.filter((f) => f.active).length} of ${fences.length} active.`}
        action={canWrite ? <GeofenceForm /> : null}
      />

      {fences.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            icon={MapPinned}
            title="No geofences yet"
            description="Draw a zone around a depot, customer site or restricted area to get enter and exit alerts."
            action={canWrite ? <GeofenceForm /> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card className="overflow-hidden py-0">
            <div className="h-[32rem]">
              <MapView fences={mapFences} />
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {fences.map((f) => (
              <Card key={f.id} size="sm" className="lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <Badge variant={f.active ? "default" : "secondary"}>
                      {f.active ? "Active" : "Paused"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    {f.radiusM} m radius ·{" "}
                    {f.centerLat != null && f.centerLng != null
                      ? `${f.centerLat.toFixed(4)}, ${f.centerLng.toFixed(4)}`
                      : "no centre"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f._count.alerts} alert{f._count.alerts === 1 ? "" : "s"} ·
                    added {formatDate(f.createdAt)}
                  </p>

                  {canWrite && (
                    <div className="flex items-center gap-1 pt-1">
                      <GeofenceForm fence={f} />
                      <form action={toggleGeofence}>
                        <input type="hidden" name="id" value={f.id} />
                        <Button type="submit" variant="ghost" size="xs">
                          {f.active ? "Pause" : "Resume"}
                        </Button>
                      </form>
                      <form action={deleteGeofence}>
                        <input type="hidden" name="id" value={f.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
