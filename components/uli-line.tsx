"use client";

import { useEffect, useRef } from "react";

/**
 * One continuous uli line, drawn once when it enters view and then still.
 * Plain CSS (stroke-dashoffset on a normalised pathLength), so no animation
 * library ships on first load. Paths are authored on the given viewBox;
 * preserveAspectRatio="none" plus non-scaling strokes let the line stretch
 * with its container at a constant weight. Reduced motion: drawn already.
 */
export function UliLine({
  d,
  accent,
  viewBox = "0 0 1440 900",
  className,
  delay = 0.15,
  duration = 1.6,
}: {
  d: string;
  accent?: string;
  viewBox?: string;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.drawn = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg ref={ref} viewBox={viewBox} preserveAspectRatio="none" className={`uli-draw ${className ?? ""}`} aria-hidden="true">
      <path d={d} pathLength={1} className="uli-line" style={{ transitionDuration: `${duration}s`, transitionDelay: `${delay}s` }} />
      {accent ? (
        <path
          d={accent}
          pathLength={1}
          className="uli-line"
          data-accent=""
          style={{ transitionDuration: "0.5s", transitionDelay: `${delay + duration - 0.1}s`, transitionTimingFunction: "var(--ease-out)" }}
        />
      ) : null}
    </svg>
  );
}
