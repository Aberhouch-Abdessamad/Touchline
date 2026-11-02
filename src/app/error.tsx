"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RefreshCw, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const errorContent = t.content.error;

  useEffect(() => {
    // Keep the technical detail in the console for debugging; the UI stays calm.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="error-page">
      <p className="error-page__code" aria-hidden="true">
        {errorContent.oops}
      </p>
      <h1 className="error-page__title">{errorContent.title}</h1>
      <p className="error-page__body">{errorContent.body}</p>
      {error.digest ? (
        <p className="small text-muted">
          {errorContent.reference}{" "}
          <span className="u-dir-ltr">
            <code>{error.digest}</code>
          </span>
        </p>
      ) : null}
      <div className="error-page__actions">
        <button type="button" className="btn btn--accent" onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" />
          {t.common.retry}
        </button>
        <Link href="/matches" className="btn btn--ghost">
          {errorContent.actions.todays}
        </Link>
        <Link href="/" className="btn btn--ghost">
          <Home size={15} aria-hidden="true" />
          {t.common.home}
        </Link>
        <Link href="/search" className="btn btn--ghost">
          <Search size={15} aria-hidden="true" />
          {t.layout.nav.search}
        </Link>
      </div>
    </div>
  );
}
