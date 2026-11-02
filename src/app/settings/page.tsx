import type { Metadata } from "next";
import { SettingsPageView } from "./SettingsPageView";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Choose a theme and time zone, enable kick-off alerts, manage favourite teams, competitions and matches, and export or import your local preferences.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: true },
};

export default function SettingsPage() {
  return <SettingsPageView />;
}
