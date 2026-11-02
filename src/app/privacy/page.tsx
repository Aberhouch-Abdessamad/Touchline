import type { Metadata } from "next";
import { PrivacyView } from "./PrivacyView";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Touchline stores in your browser, what it never collects, and how to export or delete your local preferences.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
