/**
 * The hues a surface can be tinted with.
 *
 * A tone is applied by putting `data-tone="<tone>"` on any element: the CSS in
 * app/globals.css rebinds `--tone` / `--tone-ink` for that subtree, and every
 * `bg-tone`, `text-tone-ink`, `border-l-tone` and hover glow inside it follows.
 * That is why nothing in the app builds Tailwind class names from a variable -
 * the colour travels through CSS custom properties instead, which keeps the
 * class strings static and safe to scan.
 */

/**
 * The ten hues, named by colour. For a module that only has to look distinct
 * from its neighbours in the nav - which shade it lands on carries no meaning
 * beyond "not the one above it".
 */
export const HUE_TONES = [
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

/**
 * The same machinery, named by meaning. A refuelling card asks for `fuel` and
 * a fired incident for `alert`, so that if the palette ever re-points those at
 * a different hue the call sites do not have to be found and rewritten.
 */
export const SEMANTIC_TONES = [
  "success",
  "warning",
  "danger",
  "fuel",
  "expense",
  "trip",
  "alert",
] as const;

export const TONES = [...HUE_TONES, ...SEMANTIC_TONES] as const;

export type HueTone = (typeof HUE_TONES)[number];
export type SemanticTone = (typeof SEMANTIC_TONES)[number];
export type Tone = (typeof TONES)[number];
