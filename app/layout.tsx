import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Sora } from "next/font/google";
import "./globals.css";

// Body copy. Inter's tabular figures matter here - odometers, speeds and
// distances sit in columns that must not jitter between rows.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Headings and card titles. Sora is geometric and a little wider than Inter,
// which is what gives a heading its voice next to the body text.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

// Only used for IMEIs and coordinates, where character alignment is the point.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Pages set a bare title ("Sign in"); the template keeps the brand on it.
  title: {
    default: "Vehicle Tracker",
    template: "%s · Vehicle Tracker",
  },
  description:
    "Fleet GPS tracking: live map, trip history, geofencing and alerts.",
};

export const viewport: Viewport = {
  // Matches --background in each theme, so the browser chrome on mobile does
  // not sit on a white strip above a dark page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1525" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
