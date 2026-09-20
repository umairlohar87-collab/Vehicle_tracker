import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Plain form controls for the entity dialogs.
 *
 * These are deliberately native `<input>` / `<select>` / `<textarea>` rather
 * than the Base UI primitives: server actions read `FormData`, and a native
 * control is the only thing guaranteed to put its value there whether the
 * dialog was submitted by mouse, keyboard or before hydration finished.
 */

const controlClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30";

export function Field({
  label,
  htmlFor,
  errors,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !errors?.length && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {errors?.length ? (
        <p id={errorId} className="text-xs text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  name,
  errors,
  className,
  ...props
}: React.ComponentProps<"input"> & { name: string; errors?: string[] }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={errors?.length ? `${name}-error` : undefined}
      className={cn(controlClass, className)}
      {...props}
    />
  );
}

export function SelectField({
  name,
  errors,
  className,
  children,
  ...props
}: React.ComponentProps<"select"> & { name: string; errors?: string[] }) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={errors?.length ? `${name}-error` : undefined}
      className={cn(controlClass, "pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextAreaField({
  name,
  errors,
  className,
  ...props
}: React.ComponentProps<"textarea"> & { name: string; errors?: string[] }) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={errors?.length ? true : undefined}
      aria-describedby={errors?.length ? `${name}-error` : undefined}
      className={cn(controlClass, "h-auto min-h-20 py-2", className)}
      {...props}
    />
  );
}

/** Renders each member of a schema enum as an option, nicely cased. */
export function EnumOptions({ values }: { values: readonly string[] }) {
  return (
    <>
      {values.map((value) => (
        <option key={value} value={value}>
          {value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ")}
        </option>
      ))}
    </>
  );
}
