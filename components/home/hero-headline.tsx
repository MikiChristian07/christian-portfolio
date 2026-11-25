"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { person } from "@/content/person";

/**
 * The hero headline with one living word: what Christian builds, cycling
 * through things he has actually built (Kordy is an AI agent, Insight Hub a
 * dashboard, Titleflow a platform).
 *
 * - Typed out letter by letter, held, then deleted; a camwood caret blinks
 *   while it rests. The word has its own line, with an invisible copy of the
 *   widest word holding its height, so nothing else moves (no layout shift).
 * - Screen readers and crawlers get the plain sentence; the animated copy is
 *   aria-hidden.
 * - WCAG 2.2.2: it pauses on headline hover, while typing a question, when the tab is
 *   hidden, and with the "Pause motion" control (remembered). Reduced-motion
 *   visitors see the first word, still.
 */
const words = ["product,", "AI agent,", "dashboard,", "platform,"] as const;
const TYPE_MS = 65; // per letter typed
const DELETE_MS = 35; // per letter deleted (faster: the eye doesn't read it)
const HOLD_MS = 1300; // a finished word rests long enough to read
const GAP_MS = 200; // empty beat before the next word
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
  const [typed, setTyped] = useState<string>(words[0]);
  const [phase, setPhase] = useState<"hold" | "delete" | "type">("hold");
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

  // Whenever it pauses (hover, typing a question, Pause button), show the whole current word,
  // never a half-typed one; it resumes from the rest. Derived during render, not in an effect.
  if (!running && (typed !== words[index] || phase !== "hold")) {
    setTyped(words[index]!);
    setPhase("hold");
  }

  // One step of the typewriter per timeout; it simply stops while paused and continues from
  // the same letter when resumed. Steps are skipped while the tab is hidden.
  useEffect(() => {
    if (!running) return;
    const word = words[index]!;
    const step = () => {
      if (document.visibilityState !== "visible") return;
      if (phase === "hold") setPhase("delete");
      else if (phase === "delete") {
        if (typed.length > 0) setTyped(typed.slice(0, -1));
        else {
          setIndex((index + 1) % words.length);
          setPhase("type");
        }
      } else if (typed.length < word.length) setTyped(word.slice(0, typed.length + 1));
      else setPhase("hold");
    };
    const delay =
      phase === "hold" ? HOLD_MS : phase === "delete" ? (typed.length ? DELETE_MS : GAP_MS) : typed.length < word.length ? TYPE_MS : 0;
    const timer = window.setTimeout(step, delay);
    return () => window.clearTimeout(timer);
  }, [running, phase, typed, index]);

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
          {/* The invisible widest word holds the line's height, so typing never moves the layout. */}
          <span className="grid">
            <span className="invisible [grid-area:1/1]">dashboard,</span>
            <span className="[grid-area:1/1]" data-typed={typed}>
              {typed}
              {!reduce ? <span className="type-caret" data-resting={phase === "hold" || !running ? "" : undefined} /> : null}
            </span>
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
