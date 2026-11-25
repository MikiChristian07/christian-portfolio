"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { person } from "@/content/person";

/**
 * The hero headline with one living word: what Christian builds, cycling
 * through things he has actually built (Kordy is an AI agent, Insight Hub a
 * dashboard, Titleflow a platform).
 *
 * - The word sits on its own line, sized to the widest word, so nothing
 *   else moves (no layout shift).
 * - Screen readers and crawlers get the plain sentence; the animated copy is
 *   aria-hidden.
 * - WCAG 2.2.2: it pauses on hover or focus inside the hero, when the tab is
 *   hidden, and with the "Pause motion" control (remembered). Reduced-motion
 *   visitors see the first word, still.
 */
const words = ["product", "AI agent", "dashboard", "platform"] as const;
const HOLD_MS = 2600;
const PAUSE_KEY = "motion:paused";

const reducedMotion = {
  subscribe(cb: () => void) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  },
  get: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

export function HeroHeadline() {
  const reduce = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => true);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore the visitor's choice after hydration.
    if (localStorage.getItem(PAUSE_KEY) === "1") setUserPaused(true); // eslint-disable-line react-hooks/set-state-in-effect -- external store read on mount
  }, []);

  // Pause while the pointer is on the headline itself (someone reading it), or while focus
  // is in the hero's question box (typing). Not the whole hero: it fills most of the screen,
  // so a resting pointer would otherwise freeze the motion for almost every desktop visitor.
  useEffect(() => {
    // The heading text only (not the Pause/Play control beside it).
    const headline = rootRef.current?.querySelector("h1");
    const hero = headline?.closest("section");
    if (!headline || !hero) return;
    const typing = () => {
      const el = document.activeElement;
      return !!el && hero.contains(el) && el.matches("input, textarea");
    };
    const update = () => setHovering(headline.matches(":hover") || typing());
    const updateAfterFocus = () => requestAnimationFrame(update);
    headline.addEventListener("pointerenter", update);
    headline.addEventListener("pointerleave", update);
    hero.addEventListener("focusin", update);
    hero.addEventListener("focusout", updateAfterFocus);
    return () => {
      headline.removeEventListener("pointerenter", update);
      headline.removeEventListener("pointerleave", update);
      hero.removeEventListener("focusin", update);
      hero.removeEventListener("focusout", updateAfterFocus);
    };
  }, []);

  const running = !reduce && !userPaused && !hovering;

  useEffect(() => {
    if (!running) return;
    let timer = 0;
    const tick = () => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % words.length);
      timer = window.setTimeout(tick, HOLD_MS);
    };
    timer = window.setTimeout(tick, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [running]);

  function togglePause() {
    const next = !userPaused;
    setUserPaused(next);
    localStorage.setItem(PAUSE_KEY, next ? "1" : "0");
  }

  return (
    <div ref={rootRef}>
      <h1 id="hero-title" className="font-display text-4xl md:text-5xl max-w-[13ch]">
        <span className="sr-only">{person.headline}</span>
        <span aria-hidden="true">
          <span className="block">I build your</span>
          {/* All words share one grid cell: the cell takes the widest word's size, so the layout never shifts. */}
          <span className="headline-swap grid">
            {words.map((w, i) => (
              <span key={w} className="headline-word" data-state={i === index ? "in" : i === (index + words.length - 1) % words.length ? "out" : "wait"}>
                {w},
              </span>
            ))}
          </span>
          <span className="block">then I try to break into it.</span>
        </span>
      </h1>
      {!reduce ? (
        <button type="button" onClick={togglePause} className="press mt-3 inline-flex min-h-8 items-center gap-2 text-xs text-ink-muted hover:text-ink" aria-pressed={userPaused}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            {userPaused ? <path d="M3 2l7 4-7 4z" fill="currentColor" /> : <path d="M3 2v8M9 2v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
          </svg>
          {userPaused ? "Play motion" : "Pause motion"}
        </button>
      ) : null}
    </div>
  );
}
