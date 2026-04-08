import "./globals.css";

import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { DecomShell } from "@/components/layout/decom-shell";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Decom & CNS impact | Verizon Wireless · Network Engineering",
  description:
    "Operational workspace for mmWave decommission impact: correlate CNS pins and NRB tickets by Fuze site, LLM-assisted analysis, validation, and NA outreach drafts. Internal use.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} font-sans`}
      >
        <DecomShell>{children}</DecomShell>
      </body>
    </html>
  );
}
