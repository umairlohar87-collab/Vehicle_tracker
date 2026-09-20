import type { Metadata } from "next";
import Link from "next/link";
import { Radio } from "lucide-react";

import { deleteDevice, removeMember } from "@/app/(dashboard)/actions";
import {
  DeviceForm,
  MemberRoleForm,
  OrganizationForm,
  ProfileForm,
} from "@/app/(dashboard)/settings/settings-forms";
import { EmptyState, PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCurrentUser,
  getDevices,
  getMembers,
  getOrganization,
  getVehicles,
} from "@/lib/dal";
import { formatDate, formatRelative } from "@/lib/format";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  // The sidebar only shows this page to user:manage holders, and getMembers()
  // re-checks that permission - so reaching here without it is already a 403.
  const [user, organization, members, devices, vehicles] = await Promise.all([
    getCurrentUser(),
    getOrganization(),
    getMembers(),
    getDevices(),
    getVehicles(),
  ]);

  const canManageOrg = hasPermission(user.role, "org:manage");
  const canManageDevices = hasPermission(user.role, "device:write");
  const vehicleOptions = vehicles.map((v) => ({ id: v.id, plate: v.plate }));
  const owners = members.filter((m) => m.role === "OWNER").length;

  return (
    <div data-tone="slate" className="flex flex-col gap-4">
      <PageHeader
        module="settings"
        title="Settings"
        description="Organization, members and tracking hardware."
      />

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            Signed in as {user.email} · {ROLE_LABELS[user.role]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            {organization._count.vehicles} vehicles ·{" "}
            {organization._count.devices} devices · created{" "}
            {formatDate(organization.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManageOrg ? (
            <OrganizationForm organization={organization} />
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              <p>{organization.name}</p>
              <p className="text-muted-foreground">
                Timezone {organization.timezone}. Only an owner can change these.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="pt-4">
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Roles decide what each person can see and change.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.id === user.id;
                // The last owner keeps their role, or nobody could manage the org.
                const locked = isSelf || (m.role === "OWNER" && owners <= 1);

                return (
                  <TableRow key={m.id}>
                    <TableCell className="pl-4 font-medium">
                      {m.name ?? "—"}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      <MemberRoleForm
                        member={{ id: m.id, role: m.role }}
                        disabled={locked}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(m.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.twoFactorEnabled ? "default" : "secondary"}>
                        {m.twoFactorEnabled ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-2 text-right">
                      {!locked && (
                        <form action={removeMember}>
                          <input type="hidden" name="id" value={m.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="xs"
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="flex-row items-center justify-between pt-4">
          <div>
            <CardTitle>Devices</CardTitle>
            <CardDescription>
              Trackers registered to this organization.
            </CardDescription>
          </div>
          {canManageDevices && <DeviceForm vehicles={vehicleOptions} />}
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {devices.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No devices registered"
              description="Register a tracker by its IMEI, then pair it with a vehicle."
              action={
                canManageDevices ? (
                  <DeviceForm vehicles={vehicleOptions} />
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">IMEI</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last seen</TableHead>
                  {canManageDevices && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="pl-4 font-mono text-xs">
                      {d.imei}
                    </TableCell>
                    <TableCell>
                      {d.vehicle ? (
                        <Link
                          href={`/vehicles/${d.vehicle.id}`}
                          className="font-medium hover:underline"
                        >
                          {d.vehicle.plate}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.protocol}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.model ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={d.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(d.lastSeenAt)}
                    </TableCell>
                    {canManageDevices && (
                      <TableCell className="pr-2">
                        <span className="flex items-center justify-end gap-1">
                          <DeviceForm device={d} vehicles={vehicleOptions} />
                          <form action={deleteDevice}>
                            <input type="hidden" name="id" value={d.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="xs"
                              className="text-destructive"
                            >
                              Delete
                            </Button>
                          </form>
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>What each role is allowed to do.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["OWNER", "Everything, including billing and deleting the org."],
                ["ADMIN", "Manage members and devices; everything below."],
                ["MANAGER", "Edit vehicles, drivers, geofences; acknowledge alerts."],
                ["VIEWER", "Read-only across the fleet."],
                ["DRIVER", "Only their own vehicle, trips and alerts."],
              ] as [Role, string][]
            ).map(([role, description]) => (
              <div key={role}>
                <dt className="text-sm font-medium">{ROLE_LABELS[role]}</dt>
                <dd className="text-sm text-muted-foreground">{description}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
