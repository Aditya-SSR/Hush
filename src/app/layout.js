import { DM_Sans, Instrument_Sans, Inter } from "next/font/google";
import "./globals.css";

/**
 * Instrument Sans carries the design. The full variable weight axis is loaded
 * (no explicit `weight`) so 400–700 are all available from one file, which is
 * what lets the type scale move between weights without a layout shift.
 */
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Inter is loaded for supporting text only — the smallest captions and labels,
 * where its tighter counters stay readable below ~13px. It is not used for
 * display or headings.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Retained only so the DM Sans variable keeps resolving if any stale class
// references it; unused by the current type scale.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Hush — H1",
  description:
    "HUSH is a minimalist, design-focused audio company. The H1 is a premium over-ear headphone engineered around silence, clarity, comfort and immersion.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${inter.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-neutral-900">{children}</body>
    </html>
  );
}