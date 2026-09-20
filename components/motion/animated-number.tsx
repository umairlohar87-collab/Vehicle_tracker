"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts up to `value` the first time the number scrolls into view.
 *
 * The first render - server and client alike - prints the final number, so the
 * markup hydrates cleanly and a reader without JavaScript still sees the
 * figure. Only once mounted does it drop to the starting point and animate,
 * which is a single frame the eye reads as the count beginning.
 *
 * Formatting stays as props rather than a callback because this crosses the
 * server/client boundary, where functions cannot be passed.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix,
  suffix,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  // Null until an animation has something to show, so every render before that
  // - server, hydration, reduced motion - falls through to the real figure.
  const [animated, setAnimated] = useState<number | null>(null);
  // Where the next run counts from: 0 on first sight, then the figure already
  // on screen, so a refreshed dashboard ticks rather than restarting.
  const from = useRef(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    const start = from.current;
    from.current = value;

    const controls = animate(start, value, {
      duration: Math.min(1.1, 0.35 + Math.abs(value - start) / 260),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setAnimated,
    });

    return () => controls.stop();
  }, [inView, reduceMotion, value]);

  const text = (animated ?? value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
