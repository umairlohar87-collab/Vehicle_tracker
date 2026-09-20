"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { SelectField } from "@/components/dashboard/form-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { humanizeEnum } from "@/lib/format";

const SEVERITIES = ["INFO", "WARNING", "CRITICAL"];

const KINDS = [
  "SPEEDING",
  "HARSH_BRAKING",
  "HARSH_ACCELERATION",
  "EXCESSIVE_IDLE",
  "IGNITION_ON",
  "IGNITION_OFF",
  "GEOFENCE_ENTER",
  "GEOFENCE_EXIT",
  "POWER_CUT",
  "SOS",
  "LOW_BATTERY",
  "DEVICE_OFFLINE",
];

export function AlertFilters({
  vehicles,
}: {
  vehicles: { id: string; plate: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`?${next.toString()}`);
  }

  const unackOnly = params.get("unack") === "1";
  const active =
    unackOnly || ["severity", "kind", "vehicleId"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="severity">Severity</Label>
        <SelectField
          name="severity"
          className="w-36"
          value={params.get("severity") ?? ""}
          onChange={(e) => update("severity", e.target.value)}
        >
          <option value="">Any</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {humanizeEnum(s)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kind">Type</Label>
        <SelectField
          name="kind"
          className="w-48"
          value={params.get("kind") ?? ""}
          onChange={(e) => update("kind", e.target.value)}
        >
          <option value="">Any</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {humanizeEnum(k)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vehicleId">Vehicle</Label>
        <SelectField
          name="vehicleId"
          className="w-44"
          value={params.get("vehicleId") ?? ""}
          onChange={(e) => update("vehicleId", e.target.value)}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate}
            </option>
          ))}
        </SelectField>
      </div>

      <Button
        variant={unackOnly ? "secondary" : "outline"}
        size="sm"
        onClick={() => update("unack", unackOnly ? "" : "1")}
      >
        Unacknowledged only
      </Button>

      {active && (
        <Button variant="ghost" size="sm" onClick={() => router.push("?")}>
          <X />
          Clear
        </Button>
      )}
    </div>
  );
}
