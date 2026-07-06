import type { Metadata } from "next";
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
