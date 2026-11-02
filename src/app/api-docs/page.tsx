import type { Metadata } from "next";
import { LEAGUES } from "@/data/leagues";
import { ApiDocsView } from "./ApiDocsView";

export const metadata: Metadata = {
  title: "API documentation",
  description:
    "The same-origin JSON routes that power Touchline: fixtures, tables, scorers, match summaries, teams, rankings, news, search, calendar exports and health checks.",
  alternates: { canonical: "/api-docs" },
};

export default function ApiDocsPage() {
  return <ApiDocsView leaguesCount={LEAGUES.length} />;
}
