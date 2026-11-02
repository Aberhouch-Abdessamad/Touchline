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
import { T } from "@/lib/i18n";
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
        eyebrow={<T k="competitions.hub.eyebrow" />}
        title={<T k="competitions.hub.title" />}
        description={<T k="competitions.hub.description" />}
        actions={
          <>
            <Link className="btn btn--ghost" href="/calendar">
              <CalendarDays size={16} aria-hidden="true" />
              <T k="layout.nav.calendar" />
            </Link>
            <Link className="btn btn--soft" href="/matches">
              <Radio size={16} aria-hidden="true" />
              <T k="competitions.hub.matchCentre" />
            </Link>
          </>
        }
      />

      <div className="cx-stats">
        <span className="cx-stat">
          <Trophy size={14} aria-hidden="true" />
          <strong>{LEAGUES.length}</strong>
          <T k="competitions.hub.stats.competitions" />
        </span>
        <span className="cx-stat">
          <Globe2 size={14} aria-hidden="true" />
          <strong>{regions}</strong>
          <T k="competitions.hub.stats.regions" />
        </span>
        <span className="cx-stat">
          <Users size={14} aria-hidden="true" />
          <strong>{womens}</strong>
          <T k="competitions.hub.stats.womens" />
        </span>
        <span className="cx-stat">
          <Sparkles size={14} aria-hidden="true" />
          <strong>{cups}</strong>
          <T k="competitions.hub.stats.cupFormats" />
        </span>
        <span className="cx-stats__note">
          <T k="competitions.hub.statsNote" />
        </span>
      </div>

      <CompetitionsExplorer leagues={LEAGUES} />
    </div>
  );
}
