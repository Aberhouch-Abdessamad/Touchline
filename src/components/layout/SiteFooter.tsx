"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { SITE_NAME } from "@/lib/site";
import { BrandMark } from "./BrandMark";

type FooterLabelKey = keyof Dict["layout"]["footer"]["labels"];
type GroupTitleKey = keyof Dict["layout"]["footer"]["groups"];

interface FooterGroup {
  titleKey: GroupTitleKey;
  links: Array<{ href: string; labelKey: FooterLabelKey }>;
}

const FOOTER_GROUPS: FooterGroup[] = [
  {
    titleKey: "explore",
    links: [
      { href: "/matches", labelKey: "matches" },
      { href: "/competitions", labelKey: "competitions" },
      { href: "/predictions", labelKey: "predictions" },
      { href: "/news", labelKey: "news" },
      { href: "/rankings", labelKey: "rankings" },
      { href: "/calendar", labelKey: "calendar" },
    ],
  },
  {
    titleKey: "project",
    links: [
      { href: "/about", labelKey: "about" },
      { href: "/api-docs", labelKey: "apiDocs" },
      { href: "/faq", labelKey: "faqs" },
      { href: "/contact", labelKey: "contact" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { href: "/privacy", labelKey: "privacy" },
      { href: "/settings", labelKey: "settings" },
    ],
  },
];

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <Link
            href="/"
            className="brand brand--footer"
            aria-label={`${SITE_NAME} ${t.layout.home}`}
          >
            <BrandMark />
            <span className="brand__text">
              <span className="brand__name">{SITE_NAME}</span>
              <span className="brand__tag">{t.layout.brandTag}</span>
            </span>
          </Link>
          <p className="site-footer__blurb">{t.layout.footer.blurb}</p>
          <div className="site-footer__status">
            <span className="live-dot" aria-hidden="true" />
            {t.layout.footer.status}
          </div>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav
            key={group.titleKey}
            className="site-footer__nav"
            aria-label={t.layout.footer.groups[group.titleKey]}
          >
            <h2 className="site-footer__heading">
              {t.layout.footer.groups[group.titleKey]}
            </h2>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    {t.layout.footer.labels[link.labelKey]}
                  </Link>
                </li>
              ))}
              {group.titleKey === "project" ? (
                <li>
                  <a
                    href="https://www.espn.com/soccer/"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t.layout.footer.espnSoccer}
                    <ArrowUpRight size={13} aria-hidden="true" data-flip="rtl" />
                  </a>
                </li>
              ) : null}
              {group.titleKey === "explore" ? (
                <li>
                  <a
                    href="https://www.fifa.com/fifa-world-ranking"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t.layout.footer.fifaRankings}
                    <ArrowUpRight size={13} aria-hidden="true" data-flip="rtl" />
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </div>

      <div className="site-footer__bottom">
        <p>
          {SITE_NAME}. {t.layout.footer.independent}
        </p>
        <p className="site-footer__attribution">{t.layout.footer.attribution}</p>
      </div>
    </footer>
  );
}
