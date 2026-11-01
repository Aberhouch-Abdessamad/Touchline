import Link from "next/link";
import { Compass, Home, Search, Trophy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="error-page">
      <p className="error-page__code" aria-hidden="true">
        404
      </p>
      <h1 className="error-page__title">That page is off the pitch</h1>
      <p className="error-page__body">
        The address may be mistyped, or the competition, team or match you were
        looking for is not in the provider&apos;s index. Try the directory, a
        search, or today&apos;s fixtures.
      </p>
      <div className="error-page__actions">
        <Link href="/matches" className="btn btn--accent">
          <Compass size={16} aria-hidden="true" />
          Today&apos;s matches
        </Link>
        <Link href="/competitions" className="btn btn--ghost">
          <Trophy size={15} aria-hidden="true" />
          Competitions
        </Link>
        <Link href="/search" className="btn btn--ghost">
          <Search size={15} aria-hidden="true" />
          Search
        </Link>
        <Link href="/" className="btn btn--ghost">
          <Home size={15} aria-hidden="true" />
          Home
        </Link>
      </div>
    </div>
  );
}
