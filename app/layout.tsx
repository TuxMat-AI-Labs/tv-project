import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ScrollReveal } from "@/components/hub/ScrollReveal";

// Poppins is TuxMat's primary brand font. next/font self-hosts it at build
// time, so no external font CDN is hit at runtime (important on Render).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "TuxDisplay",
  description: "TuxMat's digital signage hub",
};

// Locks pinch/scale to 100% — some Smart TV browsers ship with a non-100%
// default "page zoom," which throws off fractional device-pixel rendering
// (hairline seams between elements, moiré-prone edges) until manually reset.
// This can't override a browser-chrome zoom control (that's a device setting,
// not a page one), but it removes the page itself as a source of scale drift.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}
