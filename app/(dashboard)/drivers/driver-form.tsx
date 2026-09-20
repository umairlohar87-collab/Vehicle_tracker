"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { saveDriver } from "@/app/(dashboard)/actions";
import { useDialogForm } from "@/components/dashboard/use-dialog-form";
import {
  EnumOptions,
  Field,
  SelectField,
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

export type DriverFormValues = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  licenseExpiry: Date | null;
  status: string;
};

const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

/** `<input type="date">` only accepts YYYY-MM-DD, never a full ISO string. */
function dateValue(value: Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function DriverForm({ driver }: { driver?: DriverFormValues }) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogForm(saveDriver, () =>
    setOpen(false),
  );


  const editing = Boolean(driver);
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit driver">
              <Pencil />
            </Button>
          ) : (
            <Button>
              <Plus />
              Add driver
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit driver" : "Add driver"}</DialogTitle>
            <DialogDescription>
              Drivers can be assigned to vehicles and are attributed to the trips
              those vehicles make.
            </DialogDescription>
          </DialogHeader>

          {driver && <input type="hidden" name="id" value={driver.id} />}

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
                defaultValue={driver?.name ?? ""}
                errors={errors.name}
              />
            </Field>

            <Field label="Email" htmlFor="email" errors={errors.email}>
              <TextField
                name="email"
                type="email"
                defaultValue={driver?.email ?? ""}
                errors={errors.email}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" errors={errors.phone}>
              <TextField name="phone" defaultValue={driver?.phone ?? ""} />
            </Field>

            <Field
              label="Licence number"
              htmlFor="licenseNumber"
              errors={errors.licenseNumber}
            >
              <TextField
                name="licenseNumber"
                defaultValue={driver?.licenseNumber ?? ""}
              />
            </Field>

            <Field
              label="Licence expiry"
              htmlFor="licenseExpiry"
              errors={errors.licenseExpiry}
            >
              <TextField
                name="licenseExpiry"
                type="date"
                defaultValue={dateValue(driver?.licenseExpiry)}
                errors={errors.licenseExpiry}
              />
            </Field>

            <Field
              label="Status"
              htmlFor="status"
              errors={errors.status}
              className="sm:col-span-2"
            >
              <SelectField
                name="status"
                defaultValue={driver?.status ?? "ACTIVE"}
                errors={errors.status}
              >
                <EnumOptions values={STATUSES} />
              </SelectField>
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
              {pending ? "Saving…" : editing ? "Save changes" : "Add driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
