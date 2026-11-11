import { CircleDot, Tv, Trophy, Zap } from "lucide-react";

/**
 * Decorative 3D stage for the home masthead: a perspective pitch, a floating
 * ball and glass chips at different depths. Pure CSS/SVG (no WebGL), carries
 * no data and is hidden from assistive tech.
 */
export function HomeStage3D() {
  return (
    <div className="h3d" aria-hidden="true">
      <div className="h3d__scene">
        <div className="h3d__pitch">
          <i className="h3d__stripes" />
          <i className="h3d__line h3d__line--half" />
          <i className="h3d__line h3d__line--circle" />
          <i className="h3d__line h3d__line--box h3d__line--box-l" />
          <i className="h3d__line h3d__line--box h3d__line--box-r" />
          <i className="h3d__goal h3d__goal--l" />
          <i className="h3d__goal h3d__goal--r" />
        </div>
        <span className="h3d__spot" />
        <div className="h3d__float h3d__float--ball">
          <span className="h3d__ball">
            <span className="h3d__ball-pattern" />
          </span>
          <span className="h3d__ball-shadow" />
        </div>
        <span className="h3d__chip h3d__chip--a"><Trophy size={20} /></span>
        <span className="h3d__chip h3d__chip--b"><Zap size={20} /></span>
        <span className="h3d__chip h3d__chip--c"><Tv size={20} /></span>
        <span className="h3d__chip h3d__chip--d"><CircleDot size={20} /></span>
      </div>
    </div>
  );
}
