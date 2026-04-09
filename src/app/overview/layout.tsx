import type { Metadata } from "next";
import { APP_NAME } from "@/config/app-brand";

export const metadata: Metadata = {
  title: `Live metrics · ${APP_NAME} | Verizon Wireless NE`,
  description: `${APP_NAME} operations view: CNS/NRB volumes, decommission context, reinstatement candidates, and regional NID trends from your feeds.`,
};

export default function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
