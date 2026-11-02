import type { Metadata } from "next";
import { LEAGUES } from "@/data/leagues";
import { AboutView } from "./AboutView";

export const metadata: Metadata = {
  title: "About",
  description:
    "Touchline is an independent football data project built on ESPN's public soccer APIs and FIFA's public rankings API — original design, no accounts, no invented numbers.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutView leaguesCount={LEAGUES.length} />;
}
