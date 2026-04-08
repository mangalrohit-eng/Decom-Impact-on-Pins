import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DecomShell } from "@/components/layout/decom-shell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Decom & CNS impact | Verizon NE",
  description:
    "Compare customer network signals (CNS / NRB) before and after mmWave decommission dates by Fuze site ID.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <DecomShell>{children}</DecomShell>
      </body>
    </html>
  );
}
