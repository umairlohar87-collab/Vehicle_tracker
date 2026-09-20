import { cn } from "cn"

/**
 * A light sweeps left to right across the placeholder rather than the whole
 * block pulsing, which reads as "loading" instead of "disabled". The sweep is
 * an ::after layer so the skeleton itself stays a plain sized box, and
 * prefers-reduced-motion leaves a still tint behind.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        "after:absolute after:inset-0 after:animate-shimmer-sweep after:bg-linear-to-r after:from-transparent after:via-foreground/10 after:to-transparent after:content-['']",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
