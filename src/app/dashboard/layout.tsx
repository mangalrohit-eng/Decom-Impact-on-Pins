import type { Metadata } from "next";
import { APP_NAME } from "@/config/app-brand";

export const metadata: Metadata = {
  title: `Guided analysis · ${APP_NAME} | Verizon Wireless NE`,
  description: `${APP_NAME}: five-step workflow from inventory and signal feeds through AI-assisted review, validation, and NA outreach drafts.`,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
