import { T } from "../i18n/T";
import { Skeleton } from "./Primitives";

/**
 * Shared route-level loading skeleton. Route segments render their own
 * specialised variants where the page has a distinctive shape (match centre,
 * competition, calendar), but the generic list pages share this.
 */
export function PageSkeleton({
  rows = 6,
  header = true,
}: {
  rows?: number;
  header?: boolean;
}) {
  return (
    <div className="loading-page" aria-hidden="true">
      <T k="common.loading" className="sr-only" />
      {header ? (
        <div style={{ marginBottom: 24, display: "grid", gap: 10 }}>
          <Skeleton width={90} height={10} />
          <Skeleton width="42%" height={34} />
          <Skeleton width="60%" height={13} />
        </div>
      ) : null}
      <div className="loading-grid">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="loading-row" key={index}>
            <Skeleton width={48} height={30} />
            <div className="loading-row__text">
              <Skeleton width="46%" height={13} />
              <Skeleton width="38%" height={13} />
            </div>
            <Skeleton width={38} height={20} />
          </div>
        ))}
      </div>
    </div>
  );
}
