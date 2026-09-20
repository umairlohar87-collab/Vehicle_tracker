/**
 * The ten hues a surface can be tinted with.
 *
 * A tone is applied by putting `data-tone="<tone>"` on any element: the CSS in
 * app/globals.css rebinds `--tone` / `--tone-ink` for that subtree, and every
 * `bg-tone`, `text-tone-ink`, `border-l-tone` and hover glow inside it follows.
 * That is why nothing in the app builds Tailwind class names from a variable -
 * the colour travels through CSS custom properties instead, which keeps the
 * class strings static and safe to scan.
 */
export const TONES = [
  "brand",
  "sky",
  "indigo",
  "violet",
  "emerald",
  "teal",
  "amber",
  "orange",
  "rose",
  "slate",
] as const;

export type Tone = (typeof TONES)[number];
