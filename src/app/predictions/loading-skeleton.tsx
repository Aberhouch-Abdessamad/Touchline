import { Skeleton } from "@/components/ui/Primitives";

export function PredictionsSkeleton() {
  return (
    <div className="pl-page" aria-hidden="true">
      <Skeleton height={220} />
      <Skeleton height={56} />
      <div className="pl-stats">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} height={110} />
        ))}
      </div>
      <Skeleton height={280} />
    </div>
  );
}
