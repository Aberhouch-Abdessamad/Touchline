"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Search suggestions stay English — they query the same English data index. */
const SUGGESTIONS = [
  { label: "Arsenal", href: "/search?q=Arsenal" },
  { label: "Real Madrid", href: "/search?q=Real%20Madrid" },
  { label: "Premier League", href: "/search?q=Premier%20League" },
  { label: "Champions League", href: "/search?q=Champions%20League" },
  { label: "Nigeria", href: "/search?q=Nigeria" },
] as const;

export function SearchShellView() {
  const { t } = useI18n();
  const hero = t.content.search.hero;

  return (
    <section className="search-hero">
      <p className="kicker kicker--accent" style={{ textAlign: "center" }}>
        {hero.kicker}
      </p>
      <h1 className="search-hero__title">{hero.title}</h1>
      <p className="search-hero__sub">{hero.sub}</p>
      <form className="search-hero__form" action="/search" method="get" role="search">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="site-search">
          {hero.searchLabel}
        </label>
        <input
          id="site-search"
          className="search-hero__input"
          type="search"
          name="q"
          placeholder={hero.placeholder}
          autoComplete="off"
          maxLength={80}
        />
        <button type="submit" className="btn btn--accent search-hero__submit">
          {hero.submit}
        </button>
      </form>
      <div className="search-hint">
        <span>{hero.tryLabel}</span>
        {SUGGESTIONS.map((suggestion) => (
          <Link key={suggestion.href} href={suggestion.href}>
            {suggestion.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
