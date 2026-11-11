export const SITE_NAME = "Touchline";
export const SITE_TAGLINE = "Football, without the noise.";
export const SITE_DESCRIPTION =
  "Live football scores, league tables, fixtures, FIFA rankings and calendar exports for 76 competitions — built on real, public sports data.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export const NAV_ITEMS = [
  { href: "/matches", label: "Matches" },
  { href: "/competitions", label: "Competitions" },
  { href: "/predictions", label: "AI Predictions" },
  { href: "/news", label: "News" },
  { href: "/rankings", label: "Rankings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/search", label: "Search" },
] as const;

export const FOOTER_LINKS = [
  {
    title: "Explore",
    links: [
      { href: "/matches", label: "Matches" },
      { href: "/competitions", label: "Competitions" },
      { href: "/predictions", label: "AI Predictions" },
      { href: "/news", label: "News" },
      { href: "/rankings", label: "FIFA rankings" },
      { href: "/calendar", label: "Calendar" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: "/api-docs", label: "API docs" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/settings", label: "Settings" },
    ],
  },
] as const;

export const DATA_ATTRIBUTION =
  "Match, table and fixture data from ESPN's public APIs. Rankings from FIFA. Touchline is an independent project and is not affiliated with either provider.";
