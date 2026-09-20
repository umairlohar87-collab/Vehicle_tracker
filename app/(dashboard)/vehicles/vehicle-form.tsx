"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { saveVehicle } from "@/app/(dashboard)/actions";
import { useDialogForm } from "@/components/dashboard/use-dialog-form";
import {
  EnumOptions,
  Field,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/dashboard/form-fields";
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

export type VehicleFormValues = {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin?: string | null;
  color: string | null;
  fuelType: string | null;
  status: string;
  notes?: string | null;
  driver: { id: string; name: string } | null;
};

const STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;

export function VehicleForm({
  vehicle,
  drivers,
}: {
  vehicle?: VehicleFormValues;
  drivers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogForm(saveVehicle, () =>
    setOpen(false),
  );


  const editing = Boolean(vehicle);
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit vehicle">
              <Pencil />
            </Button>
          ) : (
            <Button>
              <Plus />
              Add vehicle
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
            <DialogDescription>
              The plate is what identifies this vehicle across the fleet, and
              must be unique within your organization.
            </DialogDescription>
          </DialogHeader>

          {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <Field label="Plate" htmlFor="plate" errors={errors.plate}>
              <TextField
                name="plate"
                required
                defaultValue={vehicle?.plate ?? ""}
                placeholder="FLEET-001"
                errors={errors.plate}
              />
            </Field>

            <Field label="Status" htmlFor="status" errors={errors.status}>
              <SelectField
                name="status"
                defaultValue={vehicle?.status ?? "ACTIVE"}
                errors={errors.status}
              >
                <EnumOptions values={STATUSES} />
              </SelectField>
            </Field>

            <Field label="Make" htmlFor="make" errors={errors.make}>
              <TextField
                name="make"
                defaultValue={vehicle?.make ?? ""}
                placeholder="Toyota"
              />
            </Field>

            <Field label="Model" htmlFor="model" errors={errors.model}>
              <TextField
                name="model"
                defaultValue={vehicle?.model ?? ""}
                placeholder="Hilux"
              />
            </Field>

            <Field label="Year" htmlFor="year" errors={errors.year}>
              <TextField
                name="year"
                type="number"
                min={1950}
                max={new Date().getFullYear() + 1}
                defaultValue={vehicle?.year ?? ""}
                errors={errors.year}
              />
            </Field>

            <Field label="Colour" htmlFor="color" errors={errors.color}>
              <TextField
                name="color"
                defaultValue={vehicle?.color ?? ""}
                placeholder="White"
              />
            </Field>

            <Field label="Fuel" htmlFor="fuelType" errors={errors.fuelType}>
              <SelectField
                name="fuelType"
                defaultValue={vehicle?.fuelType ?? ""}
                errors={errors.fuelType}
              >
                <option value="">Not set</option>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
                <option value="LPG">LPG</option>
              </SelectField>
            </Field>

            <Field label="Driver" htmlFor="driverId" errors={errors.driverId}>
              <SelectField
                name="driverId"
                defaultValue={vehicle?.driver?.id ?? ""}
                errors={errors.driverId}
              >
                <option value="">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field
              label="VIN"
              htmlFor="vin"
              errors={errors.vin}
              className="sm:col-span-2"
            >
              <TextField name="vin" defaultValue={vehicle?.vin ?? ""} />
            </Field>

            <Field
              label="Notes"
              htmlFor="notes"
              errors={errors.notes}
              className="sm:col-span-2"
            >
              <TextAreaField name="notes" defaultValue={vehicle?.notes ?? ""} />
            </Field>
          </div>

          {state.error && (
            <p className="pb-2 text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
