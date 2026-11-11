"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Newspaper, Search, Star, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/matches", icon: CalendarDays },
  { href: "/competitions", icon: Trophy },
  { href: "/news", icon: Newspaper },
  { href: "/rankings", icon: Star },
  { href: "/search", icon: Search },
] as const;

function tabKey(href: string): keyof Dict["layout"]["nav"] {
  return href.slice(1) as keyof Dict["layout"]["nav"];
}

function Tabs() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <>
      {TABS.map(({ href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn("tab-bar__item", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            <span className="tab-bar__icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="tab-bar__label">{t.layout.nav[tabKey(href)]}</span>
          </Link>
        );
      })}
    </>
  );
}

/**
 * App-style bottom navigation, shown on phones only (see app-theme.css).
 * The active route is URL data, so it is read in a leaf inside <Suspense>.
 */
export function MobileTabBar() {
  const { t } = useI18n();
  return (
    <nav className="tab-bar" aria-label={t.layout.ariaNavMobile}>
      <Suspense fallback={null}>
        <Tabs />
      </Suspense>
    </nav>
  );
}
