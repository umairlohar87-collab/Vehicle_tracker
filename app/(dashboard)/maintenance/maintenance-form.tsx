"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { saveMaintenance } from "@/app/(dashboard)/actions";
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

export type MaintenanceFormValues = {
  id: string;
  kind: string;
  status: string;
  title: string;
  notes: string | null;
  vendor: string | null;
  dueAt: Date | null;
  dueOdometer: number | null;
  costCents: number | null;
  vehicle: { id: string; plate: string };
};

const KINDS = ["SERVICE", "REPAIR", "INSPECTION", "TIRES", "OTHER"] as const;
const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

function dateValue(value: Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function MaintenanceForm({
  record,
  vehicles,
}: {
  record?: MaintenanceFormValues;
  vehicles: { id: string; plate: string }[];
}) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogForm(saveMaintenance, () =>
    setOpen(false),
  );


  const editing = Boolean(record);
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit job">
              <Pencil />
            </Button>
          ) : (
            <Button>
              <Plus />
              Schedule job
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit job" : "Schedule maintenance"}
            </DialogTitle>
            <DialogDescription>
              A job can fall due on a date, on an odometer reading, or both —
              whichever comes first.
            </DialogDescription>
          </DialogHeader>

          {record && <input type="hidden" name="id" value={record.id} />}

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <Field
              label="Vehicle"
              htmlFor="vehicleId"
              errors={errors.vehicleId}
              className="sm:col-span-2"
            >
              <SelectField
                name="vehicleId"
                required
                defaultValue={record?.vehicle.id ?? ""}
                errors={errors.vehicleId}
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field
              label="Job"
              htmlFor="title"
              errors={errors.title}
              className="sm:col-span-2"
            >
              <TextField
                name="title"
                required
                defaultValue={record?.title ?? ""}
                placeholder="60,000 km service"
                errors={errors.title}
              />
            </Field>

            <Field label="Kind" htmlFor="kind" errors={errors.kind}>
              <SelectField
                name="kind"
                defaultValue={record?.kind ?? "SERVICE"}
                errors={errors.kind}
              >
                <EnumOptions values={KINDS} />
              </SelectField>
            </Field>

            <Field label="Status" htmlFor="status" errors={errors.status}>
              <SelectField
                name="status"
                defaultValue={record?.status ?? "SCHEDULED"}
                errors={errors.status}
              >
                <EnumOptions values={STATUSES} />
              </SelectField>
            </Field>

            <Field label="Due date" htmlFor="dueAt" errors={errors.dueAt}>
              <TextField
                name="dueAt"
                type="date"
                defaultValue={dateValue(record?.dueAt)}
                errors={errors.dueAt}
              />
            </Field>

            <Field
              label="Due at (km)"
              htmlFor="dueOdometerKm"
              errors={errors.dueOdometerKm}
            >
              <TextField
                name="dueOdometerKm"
                type="number"
                min={0}
                defaultValue={
                  record?.dueOdometer == null
                    ? ""
                    : Math.round(record.dueOdometer / 1000)
                }
                errors={errors.dueOdometerKm}
              />
            </Field>

            <Field label="Vendor" htmlFor="vendor" errors={errors.vendor}>
              <TextField name="vendor" defaultValue={record?.vendor ?? ""} />
            </Field>

            <Field label="Cost" htmlFor="costMajor" errors={errors.costMajor}>
              <TextField
                name="costMajor"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  record?.costCents == null ? "" : record.costCents / 100
                }
                errors={errors.costMajor}
              />
            </Field>

            <Field
              label="Notes"
              htmlFor="notes"
              errors={errors.notes}
              className="sm:col-span-2"
            >
              <TextAreaField name="notes" defaultValue={record?.notes ?? ""} />
            </Field>
          </div>

          {state.error && (
            <p className="pb-2 text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
