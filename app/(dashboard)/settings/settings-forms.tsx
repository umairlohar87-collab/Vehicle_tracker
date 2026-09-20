"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import {
  saveDevice,
  updateMemberRole,
  updateOrganization,
  updateProfile,
  type ActionState,
} from "@/app/(dashboard)/actions";
import {
  EnumOptions,
  Field,
  SelectField,
  TextField,
} from "@/components/dashboard/form-fields";
import { useDialogForm } from "@/components/dashboard/use-dialog-form";
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

const EMPTY: ActionState = {};
const ROLES = ["OWNER", "ADMIN", "MANAGER", "VIEWER", "DRIVER"] as const;

/** Shown after a successful save and cleared on the next submit. */
function Saved({ state }: { state: ActionState }) {
  if (state.error) {
    return <p className="text-sm text-destructive">{state.error}</p>;
  }
  if (!state.ok) return null;
  return <p className="text-sm text-muted-foreground">Saved.</p>;
}

export function OrganizationForm({
  organization,
}: {
  organization: { name: string; timezone: string };
}) {
  const [state, formAction, pending] = useActionState(updateOrganization, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization name" htmlFor="name" errors={errors.name}>
          <TextField
            name="name"
            required
            defaultValue={organization.name}
            errors={errors.name}
          />
        </Field>

        <Field
          label="Timezone"
          htmlFor="timezone"
          errors={errors.timezone}
          hint="Used when grouping reports into days."
        >
          <TextField
            name="timezone"
            required
            defaultValue={organization.timezone}
            placeholder="UTC"
            errors={errors.timezone}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function ProfileForm({ user }: { user: { name: string | null } }) {
  const [state, formAction, pending] = useActionState(updateProfile, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Your name" htmlFor="name" errors={errors.name}>
        <TextField
          name="name"
          required
          defaultValue={user.name ?? ""}
          errors={errors.name}
          className="sm:max-w-sm"
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function MemberRoleForm({
  member,
  disabled,
}: {
  member: { id: string; role: string };
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateMemberRole, EMPTY);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={member.id} />
      <SelectField
        name="role"
        defaultValue={member.role}
        disabled={disabled || pending}
        className="w-32"
        // Submitting on change keeps this to one control instead of a
        // select-plus-save pair on every row.
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <EnumOptions values={ROLES} />
      </SelectField>
      {state.error && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}

export function DeviceForm({
  device,
  vehicles,
}: {
  device?: {
    id: string;
    imei: string;
    simNumber: string | null;
    protocol: string;
    model: string | null;
    vehicle: { id: string; plate: string } | null;
  };
  vehicles: { id: string; plate: string }[];
}) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogForm(saveDevice, () =>
    setOpen(false),
  );

  const editing = Boolean(device);
  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="ghost" size="xs">
              Edit
            </Button>
          ) : (
            <Button size="sm">
              <Plus />
              Add device
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit device" : "Add device"}</DialogTitle>
            <DialogDescription>
              The IMEI is how the ingestion service recognises a tracker, so it
              must match the hardware exactly.
            </DialogDescription>
          </DialogHeader>

          {device && <input type="hidden" name="id" value={device.id} />}

          <div className="flex flex-col gap-4 py-4">
            <Field label="IMEI" htmlFor="imei" errors={errors.imei}>
              <TextField
                name="imei"
                required
                inputMode="numeric"
                placeholder="350424060000001"
                defaultValue={device?.imei ?? ""}
                errors={errors.imei}
              />
            </Field>

            <Field label="SIM number" htmlFor="simNumber" errors={errors.simNumber}>
              <TextField
                name="simNumber"
                defaultValue={device?.simNumber ?? ""}
              />
            </Field>

            <Field label="Protocol" htmlFor="protocol" errors={errors.protocol}>
              <SelectField
                name="protocol"
                defaultValue={device?.protocol ?? "teltonika"}
                errors={errors.protocol}
              >
                <option value="teltonika">Teltonika</option>
                <option value="gt06">GT06</option>
                <option value="queclink">Queclink</option>
                <option value="osmand">OsmAnd</option>
              </SelectField>
            </Field>

            <Field label="Model" htmlFor="model" errors={errors.model}>
              <TextField name="model" defaultValue={device?.model ?? ""} />
            </Field>

            <Field label="Vehicle" htmlFor="vehicleId" errors={errors.vehicleId}>
              <SelectField
                name="vehicleId"
                defaultValue={device?.vehicle?.id ?? ""}
                errors={errors.vehicleId}
              >
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
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
              {pending ? "Saving…" : editing ? "Save changes" : "Add device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
