import type { Metadata } from "next";
import { FaqView } from "./FaqView";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Touchline's data sources, refresh rates, time zones, favourites, reminders, calendar exports and missing competitions.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return <FaqView />;
}
