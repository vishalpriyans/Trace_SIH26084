import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Plex, not a UI default. Activity ids like PIP-2400-ERC-015 are compared
   character by character and confidence scores are compared down a column, so
   both need fixed advance widths and real tabular figures. Mono is reserved
   for exactly that: ids, scores, times and quantities, never as a costume for
   "technical". */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRACE",
  description:
    "Intelligent data capture and schedule-linking layer for construction progress.",
};

/**
 * Dark is the default on every surface, the field app included, so the product
 * reads as one product rather than two. The light ground is the sun switch,
 * reached deliberately: a phone at a work front in direct sunlight is legible
 * at maximum luminance and a dark screen there is not.
 *
 * Because dark is the server rendered default rather than something computed
 * per route, no blocking bootstrap script is needed here. `ThemeSwitch`
 * reapplies a stored choice on mount, and only a viewer who has actively
 * chosen the light ground can see a frame of the dark one first.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${plexSans.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
