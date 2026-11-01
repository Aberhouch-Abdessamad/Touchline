import { Skeleton } from "@/components/ui/Primitives";

export function NewsSkeleton() {
  return (
    <div className="nw-page" aria-hidden="true">
      <section className="nw-hero nw-hero--skeleton">
        <div className="nw-hero__bar">
          <Skeleton width={120} height={10} />
          <Skeleton width={110} height={26} />
        </div>
        <div className="nw-hero__body">
          <div className="nw-hero__intro">
            <Skeleton width="64%" height={44} />
            <Skeleton width="46%" height={30} className="nw-skel-gap" />
            <Skeleton width="54%" height={13} className="nw-skel-gap" />
            <Skeleton width="40%" height={10} className="nw-skel-gap" />
          </div>
          <div className="nw-top">
            <Skeleton width={96} height={9} />
            <Skeleton width="100%" height={118} className="nw-skel-gap" />
            <Skeleton width="82%" height={12} className="nw-skel-gap" />
            <Skeleton width="60%" height={12} className="nw-skel-gap" />
          </div>
        </div>
        <div className="nw-hero__stats">
          {[0, 1, 2, 3].map((stat) => (
            <div className="nw-hero__stat" key={stat}>
              <Skeleton width={58} height={8} />
              <Skeleton width={46} height={22} className="nw-skel-gap" />
            </div>
          ))}
        </div>
      </section>

      <div className="nw-front">
        <div className="nw-card nw-card--lead">
          <Skeleton height={300} />
          <div className="nw-card__body">
            <Skeleton width={130} height={9} />
            <Skeleton width="92%" height={26} className="nw-skel-gap" />
            <Skeleton width="84%" height={26} className="nw-skel-gap" />
            <Skeleton width="70%" height={11} className="nw-skel-gap" />
          </div>
        </div>
        <div className="nw-rail">
          <section className="nw-latest">
            <div className="nw-latest__head">
              <Skeleton width={140} height={18} />
              <Skeleton width={26} height={14} />
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div className="nw-skel-row" key={row}>
                <Skeleton width={20} height={12} />
                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  <Skeleton width="42%" height={8} />
                  <Skeleton width="94%" height={11} />
                </div>
                <Skeleton width={54} height={40} />
              </div>
            ))}
          </section>
          <section className="nw-about">
            <div className="nw-about__head">
              <Skeleton width={120} height={16} />
            </div>
            <div className="nw-about__body">
              <Skeleton width="100%" height={10} />
              <Skeleton width="90%" height={10} className="nw-skel-gap" />
              <Skeleton width="76%" height={10} className="nw-skel-gap" />
            </div>
          </section>
        </div>
      </div>

      <div className="nw-grid">
        {[0, 1, 2].map((card) => (
          <div className="nw-card" key={card}>
            <Skeleton height={150} />
            <div className="nw-card__body">
              <Skeleton width="88%" height={14} />
              <div style={{ marginTop: 8 }}>
                <Skeleton width="100%" height={10} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
