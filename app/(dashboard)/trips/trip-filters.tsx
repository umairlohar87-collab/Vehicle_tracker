"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { SelectField, TextField } from "@/components/dashboard/form-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Filters live in the URL rather than in component state: the server component
 * reads them from searchParams, so a filtered view is shareable, survives a
 * reload, and needs no client-side data fetching.
 */
export function TripFilters({
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
    // Any filter change invalidates the page cursor.
    next.delete("page");
    router.push(`?${next.toString()}`);
  }

  const active = ["vehicleId", "from", "to"].some((key) => params.get(key));

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vehicleId">Vehicle</Label>
        <SelectField
          name="vehicleId"
          className="w-48"
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from">From</Label>
        <TextField
          name="from"
          type="date"
          className="w-40"
          value={params.get("from") ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to">To</Label>
        <TextField
          name="to"
          type="date"
          className="w-40"
          value={params.get("to") ?? ""}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>

      {active && (
        <Button variant="ghost" size="sm" onClick={() => router.push("?")}>
          <X />
          Clear
        </Button>
      )}
    </div>
  );
}
