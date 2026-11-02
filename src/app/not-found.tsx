"use client";

import Link from "next/link";
import { Compass, Home, Search, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  const notFound = t.content.notFound;

  return (
    <div className="error-page">
      <p className="error-page__code" aria-hidden="true">
        {notFound.code}
      </p>
      <h1 className="error-page__title">{notFound.title}</h1>
      <p className="error-page__body">{notFound.body}</p>
      <div className="error-page__actions">
        <Link href="/matches" className="btn btn--accent">
          <Compass size={16} aria-hidden="true" />
          {notFound.actions.todays}
        </Link>
        <Link href="/competitions" className="btn btn--ghost">
          <Trophy size={15} aria-hidden="true" />
          {t.layout.nav.competitions}
        </Link>
        <Link href="/search" className="btn btn--ghost">
          <Search size={15} aria-hidden="true" />
          {t.layout.nav.search}
        </Link>
        <Link href="/" className="btn btn--ghost">
          <Home size={15} aria-hidden="true" />
          {t.common.home}
        </Link>
      </div>
    </div>
  );
}
