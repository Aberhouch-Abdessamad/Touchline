import Link from "next/link";
import {
  CalendarDays,
  Globe2,
  Radio,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { LEAGUES } from "@/data/leagues";
import { CompetitionsExplorer } from "@/components/competitions/CompetitionsExplorer";
import { PageHeader } from "@/components/ui/Primitives";

export const metadata = {
  title: "Competitions",
  description:
    "Browse 76 club and international football competitions with live tables, fixtures and player leaderboards.",
  alternates: { canonical: "/competitions" },
};

const regions = new Set(LEAGUES.map((league) => league.region)).size;
const womens = LEAGUES.filter((league) => league.gender === "women").length;
const cups = LEAGUES.filter((league) => league.format === "cup").length;

export default function CompetitionsPage() {
  return (
    <div className="cx-page">
      <PageHeader
        eyebrow="Competition directory"
        title="The competition index"
        description="Search the full directory by name, country or alias, then open live tables, season fixtures and player leaderboards. Women's, youth and international competitions sit alongside the domestic leagues."
        actions={
          <>
            <Link className="btn btn--ghost" href="/calendar">
              <CalendarDays size={16} aria-hidden="true" />
              Calendar
            </Link>
            <Link className="btn btn--soft" href="/matches">
              <Radio size={16} aria-hidden="true" />
              Match centre
            </Link>
          </>
        }
      />

      <div className="cx-stats">
        <span className="cx-stat">
          <Trophy size={14} aria-hidden="true" />
          <strong>{LEAGUES.length}</strong>
          <span>competitions</span>
        </span>
        <span className="cx-stat">
          <Globe2 size={14} aria-hidden="true" />
          <strong>{regions}</strong>
          <span>regions</span>
        </span>
        <span className="cx-stat">
          <Users size={14} aria-hidden="true" />
          <strong>{womens}</strong>
          <span>women&apos;s</span>
        </span>
        <span className="cx-stat">
          <Sparkles size={14} aria-hidden="true" />
          <strong>{cups}</strong>
          <span>cup formats</span>
        </span>
        <span className="cx-stats__note">
          Curated order, updated from ESPN&apos;s public league index
        </span>
      </div>

      <CompetitionsExplorer leagues={LEAGUES} />
    </div>
  );
}
