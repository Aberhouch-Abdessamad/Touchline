import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "en-GB",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f3ed",
    theme_color: "#f5f3ed",
    categories: ["sports", "news"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    shortcuts: [
      {
        name: "Today's matches",
        short_name: "Matches",
        description: "Live scores and today's fixtures",
        url: "/matches",
      },
      {
        name: "Competitions",
        short_name: "Tables",
        description: "League tables, fixtures and scorers",
        url: "/competitions",
      },
      {
        name: "FIFA rankings",
        short_name: "Rankings",
        description: "Official men's and women's world rankings",
        url: "/rankings",
      },
    ],
  };
}
