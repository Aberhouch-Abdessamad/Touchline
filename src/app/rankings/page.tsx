import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/Primitives";
import { getRankings } from "@/lib/api";
import type { RankingBoard } from "@/lib/types";
import { RankingsView } from "./RankingsView";

const CONFEDERATIONS = [
  "UEFA",
  "CONMEBOL",
  "CONCACAF",
  "CAF",
  "AFC",
  "OFC",
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseGender(value: string | undefined): "men" | "women" {
  return value === "women" ? "women" : "men";
}

export const metadata = {
  title: "FIFA rankings",
  description:
    "The official FIFA men's and women's world rankings, with movement, confederation filters and points totals from the FIFA public API.",
  alternates: { canonical: "/rankings" },
};

function RankingsSkeleton() {
  return (
    <div className="rk-page" aria-hidden="true">
      <section className="rk-hero rk-hero--skeleton">
        <div className="rk-hero__bar">
          <Skeleton width={140} height={10} />
          <Skeleton width={110} height={26} />
        </div>
        <div className="rk-hero__body">
          <div className="rk-hero__intro">
            <Skeleton width="72%" height={46} />
            <Skeleton width="54%" height={13} className="rk-skel-gap" />
            <Skeleton width={168} height={34} className="rk-skel-gap" />
          </div>
          <div className="rk-leader">
            <Skeleton width={110} height={9} />
            <Skeleton width="70%" height={40} className="rk-skel-gap" />
            <Skeleton width="46%" height={22} className="rk-skel-gap" />
          </div>
        </div>
        <div className="rk-hero__stats">
          {[0, 1, 2, 3].map((stat) => (
            <div className="rk-hero__stat" key={stat}>
              <Skeleton width={64} height={8} />
              <Skeleton width={52} height={22} className="rk-skel-gap" />
            </div>
          ))}
        </div>
      </section>
      <div className="rk-podium">
        <div className="rk-podium__head">
          <Skeleton width={130} height={18} />
        </div>
        <div className="rk-podium__grid">
          {[0, 1, 2].map((card) => (
            <div className="rk-podium__card" key={card}>
              <Skeleton width="58%" height={14} />
              <Skeleton width="80%" height={26} className="rk-skel-gap" />
              <Skeleton width="42%" height={16} className="rk-skel-gap" />
            </div>
          ))}
        </div>
      </div>
      <div className="rk-board">
        <div className="rk-board__head">
          <Skeleton width={150} height={20} />
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div className="rk-skel-row" key={row}>
            <Skeleton width={24} height={14} />
            <Skeleton width={170} height={14} />
            <Skeleton width="100%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

async function RankingsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const gender = parseGender(first(params.gender));
  const requested = first(params.confederation);
  const confederation =
    requested && CONFEDERATIONS.includes(requested as (typeof CONFEDERATIONS)[number])
      ? requested
      : "";

  let board: RankingBoard | null = null;
  let failed = false;
  try {
    board = await getRankings(gender);
  } catch {
    failed = true;
  }

  return (
    <RankingsView
      board={board}
      gender={gender}
      confederation={confederation}
      confederations={CONFEDERATIONS}
      failed={failed}
    />
  );
}

export default function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<RankingsSkeleton />}>
      <RankingsContent searchParams={searchParams} />
    </Suspense>
  );
}
