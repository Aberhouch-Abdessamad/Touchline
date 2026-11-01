import type { League } from "@/data/leagues";

export type MatchState =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "canceled"
  | "unknown";

export interface TeamRef {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  color?: string;
}

export interface MatchCompetitor extends TeamRef {
  homeAway: "home" | "away";
  score?: string;
  winner: boolean;
  form?: string;
  record?: string;
}

export interface Match {
  id: string;
  date: string;
  name: string;
  state: MatchState;
  statusLabel: string;
  statusDetail: string;
  clock?: string;
  competition: {
    name: string;
    slug?: string;
    logo?: string;
  };
  league?: League;
  home: MatchCompetitor;
  away: MatchCompetitor;
  venue?: string;
  city?: string;
  country?: string;
  attendance?: number;
  broadcasts: string[];
  round?: string;
  season?: number;
  note?: string;
}

export interface StandingStat {
  name: string;
  value: number;
  displayValue: string;
}

export interface StandingEntry {
  team: TeamRef;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string;
  note?: string;
  noteColor?: string;
}

export interface StandingGroup {
  id?: string;
  name: string;
  abbreviation?: string;
  entries: StandingEntry[];
}

export interface Scorer {
  rank: number;
  playerId: string;
  playerName: string;
  shortName: string;
  team: TeamRef;
  goals: number;
  assists: number;
  appearances?: number;
  jersey?: string;
}

export interface ScorerBoard {
  goals: Scorer[];
  assists: Scorer[];
}

export interface RankingEntry {
  rank: number;
  previousRank?: number;
  movement: number;
  teamId: string;
  countryCode?: string;
  name: string;
  confederation: string;
  points: number;
  matches?: number;
}

export interface RankingBoard {
  gender: "men" | "women";
  updatedAt?: string;
  entries: RankingEntry[];
}

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  byline?: string;
  section?: string;
}

export interface MatchEvent {
  id: string;
  minute: string;
  type: "goal" | "own-goal" | "penalty" | "yellow" | "red" | "substitution" | "other";
  text: string;
  player?: string;
  team?: TeamRef;
  homeScore?: string;
  awayScore?: string;
}

export interface MatchStat {
  name: string;
  label: string;
  home: string;
  away: string;
  homeValue: number;
  awayValue: number;
  percent?: boolean;
}

export interface LineupPlayer {
  id: string;
  name: string;
  shortName: string;
  jersey?: string;
  position?: string;
  starter: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
  formationPlace?: string;
}

export interface MatchLineup {
  team: TeamRef;
  homeAway: "home" | "away";
  formation?: string;
  players: LineupPlayer[];
}

export interface HeadToHeadMatch {
  id: string;
  date: string;
  home: TeamRef;
  away: TeamRef;
  homeScore?: string;
  awayScore?: string;
  status: string;
}

export interface TeamFormResult {
  id: string;
  date: string;
  opponent: TeamRef;
  result: string;
  score: string;
  homeAway: string;
  competition?: string;
}

export interface TeamForm {
  team: TeamRef;
  results: TeamFormResult[];
}

export interface MatchDetails {
  match: Match;
  events: MatchEvent[];
  stats: MatchStat[];
  lineups: MatchLineup[];
  headToHead: HeadToHeadMatch[];
  form: TeamForm[];
  article?: {
    headline: string;
    description?: string;
    url?: string;
  };
  news: NewsArticle[];
  broadcasts: string[];
  odds?: {
    provider?: string;
    details?: string;
  };
  lineupsAvailable: boolean;
  statsAvailable: boolean;
}

export interface TeamProfile {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  color?: string;
  standingSummary?: string;
  recordSummary?: string;
  seasonSummary?: string;
  leagueSlug?: string;
  leagueName?: string;
  leagueEspnId?: string;
}

export interface TeamFixture {
  id: string;
  date: string;
  name: string;
  home: TeamRef;
  away: TeamRef;
  homeScore?: string;
  awayScore?: string;
  state: MatchState;
  statusLabel: string;
  venue?: string;
  leagueName?: string;
  leagueSlug?: string;
}

export interface TeamPageData {
  team: TeamProfile;
  fixtures: TeamFixture[];
  league?: League;
  season: number;
}

export interface SearchTeamResult {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  leagueSlug?: string;
  leagueName?: string;
  color?: string;
}

export interface SearchResults {
  teams: SearchTeamResult[];
  leagues: League[];
  query: string;
}

export interface ApiMeta {
  source: string;
  attribution: string;
  fetchedAt: string;
  cacheSeconds: number;
}
