import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redirect · SignalSpan | Verizon Wireless NE",
  description:
    "This URL forwards to the SignalSpan home page. Use Home for the full guide and Dashboard for live metrics.",
};

export default function IntroductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
