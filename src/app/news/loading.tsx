import { NewsSkeleton } from "@/components/soccer/NewsSkeleton";

export default function NewsLoading() {
  return (
    <>
      <span className="sr-only">Loading football news</span>
      <NewsSkeleton />
    </>
  );
}
