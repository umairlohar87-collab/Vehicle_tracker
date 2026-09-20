"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { saveGeofence } from "@/app/(dashboard)/actions";
import { useDialogForm } from "@/components/dashboard/use-dialog-form";
import { Field, TextField } from "@/components/dashboard/form-fields";
import { MapView } from "@/components/map/map-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type GeofenceFormValues = {
  id: string;
  name: string;
  centerLat: number | null;
  centerLng: number | null;
  radiusM: number | null;
  color: string;
  active: boolean;
};


export function GeofenceForm({ fence }: { fence?: GeofenceFormValues }) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogForm(saveGeofence, () =>
    setOpen(false),
  );

  // Mirrored into state so the preview map follows what is typed.
  const [lat, setLat] = useState(String(fence?.centerLat ?? ""));
  const [lng, setLng] = useState(String(fence?.centerLng ?? ""));
  const [radius, setRadius] = useState(String(fence?.radiusM ?? 500));
  const [color, setColor] = useState(fence?.color ?? "#3b82f6");


  const editing = Boolean(fence);
  const errors = state.fieldErrors ?? {};

  const numLat = Number(lat);
  const numLng = Number(lng);
  const numRadius = Number(radius);
  const previewable =
    Number.isFinite(numLat) &&
    Number.isFinite(numLng) &&
    lat !== "" &&
    lng !== "" &&
    Number.isFinite(numRadius);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit geofence">
              <Pencil />
            </Button>
          ) : (
            <Button>
              <Plus />
              New geofence
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-xl">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit geofence" : "New geofence"}
            </DialogTitle>
            <DialogDescription>
              A circular zone. Vehicles crossing its edge raise enter and exit
              alerts when a matching rule is active.
            </DialogDescription>
          </DialogHeader>

          {fence && <input type="hidden" name="id" value={fence.id} />}

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <Field
              label="Name"
              htmlFor="name"
              errors={errors.name}
              className="sm:col-span-2"
            >
              <TextField
                name="name"
                required
                defaultValue={fence?.name ?? ""}
                placeholder="Main depot"
                errors={errors.name}
              />
            </Field>

            <Field label="Latitude" htmlFor="centerLat" errors={errors.centerLat}>
              <TextField
                name="centerLat"
                required
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="51.5074"
                errors={errors.centerLat}
              />
            </Field>

            <Field label="Longitude" htmlFor="centerLng" errors={errors.centerLng}>
              <TextField
                name="centerLng"
                required
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-0.1278"
                errors={errors.centerLng}
              />
            </Field>

            <Field
              label="Radius (m)"
              htmlFor="radiusM"
              errors={errors.radiusM}
              hint="Between 25 m and 100 km."
            >
              <TextField
                name="radiusM"
                type="number"
                required
                min={25}
                max={100000}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                errors={errors.radiusM}
              />
            </Field>

            <Field label="Colour" htmlFor="color" errors={errors.color}>
              <TextField
                name="color"
                type="color"
                className="h-8 px-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                errors={errors.color}
              />
            </Field>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={fence?.active ?? true}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs text-muted-foreground">Preview</p>
              <div className="h-56 overflow-hidden rounded-lg ring-1 ring-foreground/10">
                {previewable ? (
                  <MapView
                    fences={[
                      {
                        id: "preview",
                        name: "Preview",
                        centerLat: numLat,
                        centerLng: numLng,
                        radiusM: numRadius,
                        color,
                        active: true,
                      },
                    ]}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Enter coordinates to preview
                  </div>
                )}
              </div>
            </div>
          </div>

          {state.error && (
            <p className="pb-2 text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
