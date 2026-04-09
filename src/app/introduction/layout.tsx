import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview (redirect) · Decom & CNS impact | Verizon Wireless NE",
  description:
    "This path redirects to the consolidated home page. Use Home for the full guide and Dashboard for metrics.",
};

export default function IntroductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
