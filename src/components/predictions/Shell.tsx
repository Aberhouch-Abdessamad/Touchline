"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/predictions", key: "dashboard" },
  { href: "/predictions/history", key: "history" },
  { href: "/predictions/calendar", key: "calendar" },
] as const;

function Tabs() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="pl-tabs" aria-label={t.predictions.tabs.aria}>
      {TABS.map((tab) => {
        const active =
          tab.href === "/predictions"
            ? pathname === "/predictions"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn("pl-tabs__item", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            {t.predictions.tabs[tab.key]}
          </Link>
        );
      })}
    </nav>
  );
}

/** Dark masthead shared by every Predictions League page. */
export function Hero({
  eyebrow,
  title,
  accent,
  lede,
  aside,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  accent?: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="pl-hero">
      <div className="pl-hero__bar">
        <p className="pl-hero__eyebrow">
          <span className="pl-hero__spark" aria-hidden="true" />
          {eyebrow}
        </p>
        <Suspense fallback={null}>
          <Tabs />
        </Suspense>
      </div>
      <div className="pl-hero__body">
        <div className="pl-hero__intro">
          <h1 className="pl-hero__title">
            {title}
            {accent ? <span className="pl-hero__accent">{accent}</span> : null}
          </h1>
          {lede ? <p className="pl-hero__lede">{lede}</p> : null}
        </div>
        {aside ? <div className="pl-hero__aside">{aside}</div> : null}
      </div>
    </section>
  );
}
