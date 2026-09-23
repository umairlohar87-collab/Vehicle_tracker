import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";

import "./globals.css";

/**
 * Two families, loaded as variable fonts so every weight on the 400/500/600/700
 * ramp comes out of one file per family rather than four.
 *
 * The variable names are the ones `app/globals.css` composes `--font-sans` and
 * `--font-heading` from, and both classes go on <html>: the `:root` block that
 * builds those stacks is matched against <html>, so a family declared only on
 * <body> would leave the `:root` declarations referencing an undefined variable.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vehicle Tracker",
    template: "%s | Vehicle Tracker",
  },
  description: "Track your fleet — vehicles, trips, fuel, and alerts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
