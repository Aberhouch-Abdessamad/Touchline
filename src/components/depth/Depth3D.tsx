"use client";

import { useEffect } from "react";

/**
 * Site-wide 3D pointer depth. One delegated listener (no per-card handlers):
 *  - tilts the card under a fine pointer toward the cursor (`--rx`/`--ry`);
 *  - publishes the cursor position (`--mx`/`--my`, -1..1) and scroll depth
 *    (`--sy`) on <html> so the home stage can parallax.
 * Disabled for touch, coarse pointers and `prefers-reduced-motion`; the CSS
 * only reads these variables inside `[data-tilt]`, so nothing changes when the
 * script does not run.
 */
const TARGETS = [
  ".hm-card",
  ".hm-lead",
  ".content-card",
  ".competition-card",
  ".news-card",
  ".nw-card",
  ".rk-card",
  ".team-card",
  ".pl-stat",
  ".pl-highlight",
  ".pl-row",
  ".match-row",
  ".card",
].join(",");

export function Depth3D() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const root = document.documentElement;
    let current: HTMLElement | null = null;
    let frame = 0;

    const release = (el: HTMLElement | null) => {
      if (!el) return;
      el.removeAttribute("data-tilt");
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };

    const onMove = (event: PointerEvent) => {
      const { clientX, clientY } = event;
      const target = (event.target as Element | null)?.closest?.(TARGETS) as HTMLElement | null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--mx", ((clientX / window.innerWidth) * 2 - 1).toFixed(3));
        root.style.setProperty("--my", ((clientY / window.innerHeight) * 2 - 1).toFixed(3));
        if (current && current !== target) release(current);
        current = target;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const px = (clientX - rect.left) / rect.width - 0.5;
        const py = (clientY - rect.top) / rect.height - 0.5;
        // Big surfaces tilt gently, small ones more.
        const max = rect.width > 720 ? 1.6 : rect.width > 420 ? 3.5 : 7;
        target.setAttribute("data-tilt", "");
        target.style.setProperty("--rx", `${(-py * max * 2).toFixed(2)}deg`);
        target.style.setProperty("--ry", `${(px * max * 2).toFixed(2)}deg`);
      });
    };

    const onLeave = () => {
      release(current);
      current = null;
    };

    const onScroll = () => {
      root.style.setProperty("--sy", String(Math.min(window.scrollY, 900)));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      release(current);
    };
  }, []);

  return null;
}
