import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DATA_ATTRIBUTION, FOOTER_LINKS, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <Link href="/" className="brand brand--footer" aria-label={`${SITE_NAME} home`}>
            <BrandMark />
            <span className="brand__text">
              <span className="brand__name">{SITE_NAME}</span>
              <span className="brand__tag">{SITE_TAGLINE}</span>
            </span>
          </Link>
          <p className="site-footer__blurb">
            Scores, tables, fixtures and rankings from public sports APIs —
            presented without pop-ups, autoplay or invented numbers.
          </p>
          <div className="site-footer__status">
            <span className="live-dot" aria-hidden="true" />
            Live data via ESPN &amp; FIFA
          </div>
        </div>

        {FOOTER_LINKS.map((group) => (
          <nav key={group.title} className="site-footer__nav" aria-label={group.title}>
            <h2 className="site-footer__heading">{group.title}</h2>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              {group.title === "Project" ? (
                <li>
                  <a
                    href="https://www.espn.com/soccer/"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    ESPN Soccer
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </li>
              ) : null}
              {group.title === "Explore" ? (
                <li>
                  <a
                    href="https://www.fifa.com/fifa-world-ranking"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    FIFA rankings
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </div>

      <div className="site-footer__bottom">
        <p>
          {SITE_NAME}. An independent, non-commercial
          football data project.
        </p>
        <p className="site-footer__attribution">{DATA_ATTRIBUTION}</p>
      </div>
    </footer>
  );
}
