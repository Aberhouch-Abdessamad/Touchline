"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RefreshCw, Search } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the technical detail in the console for debugging; the UI stays calm.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="error-page">
      <p className="error-page__code" aria-hidden="true">
        Oops
      </p>
      <h1 className="error-page__title">Something went wrong on this page</h1>
      <p className="error-page__body">
        A data request or a component failed while rendering. Nothing you saved
        was lost — favourites and settings stay in this browser. Try the page
        again, or head somewhere that is definitely working.
      </p>
      {error.digest ? (
        <p className="small text-muted">
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="error-page__actions">
        <button type="button" className="btn btn--accent" onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" />
          Try again
        </button>
        <Link href="/matches" className="btn btn--ghost">
          Today&apos;s matches
        </Link>
        <Link href="/" className="btn btn--ghost">
          <Home size={15} aria-hidden="true" />
          Home
        </Link>
        <Link href="/search" className="btn btn--ghost">
          <Search size={15} aria-hidden="true" />
          Search
        </Link>
      </div>
    </div>
  );
}
