"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { register, type FormState } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creating account..." : "Create organization"}
    </Button>
  );
}

function Field({
  id,
  label,
  error,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(register, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          You will be the owner and can invite your team afterwards.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <Field
            id="organizationName"
            name="organizationName"
            label="Organization"
            placeholder="Acme Logistics"
            autoComplete="organization"
            required
            error={errors.organizationName?.[0]}
          />

          <Field
            id="name"
            name="name"
            label="Your name"
            placeholder="Jane Doe"
            autoComplete="name"
            required
            error={errors.name?.[0]}
          />

          <Field
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            error={errors.email?.[0]}
          />

          <Field
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            required
            error={errors.password?.[0]}
          />

          <Field
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.[0]}
          />

          <p className="text-xs text-muted-foreground">
            At least 10 characters, with an uppercase letter, a lowercase letter
            and a number.
          </p>

          <SubmitButton />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
