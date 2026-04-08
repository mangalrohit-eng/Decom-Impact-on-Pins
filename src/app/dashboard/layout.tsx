import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decom & CNS analysis | Verizon Wireless NE",
  description:
    "Guided workflow: operational feeds, AI-assisted spike review, reinstatement validation, outreach composition.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
