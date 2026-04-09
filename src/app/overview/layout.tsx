import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operations dashboard · Decom & CNS impact | Verizon Wireless NE",
  description:
    "CNS pin volumes, decommission context, reinstatement signal counts, and regional NID views from operational feeds.",
};

export default function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
