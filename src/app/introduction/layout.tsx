import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product overview · Decom & CNS impact | Verizon Wireless NE",
  description:
    "End-to-end workflow: data preparation, LLM analysis of customer signals around mmWave decommissions, human validation, and structured NA outreach drafts.",
};

export default function IntroductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
