import { NewsSkeleton } from "@/components/soccer/NewsSkeleton";
import { T } from "@/lib/i18n";

export default function NewsLoading() {
  return (
    <>
      <span className="sr-only">
        <T k="common.loading" />
      </span>
      <NewsSkeleton />
    </>
  );
}
