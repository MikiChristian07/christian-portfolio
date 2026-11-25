"use client";

import { useSyncExternalStore } from "react";
import { applyPalette } from "@/components/palette-script";
import { track } from "@/lib/analytics";

type Palette = "day" | "night";

// The palette lives on <html data-palette>; subscribe to it so every toggle stays in sync
// (Cmd+K and the London-time default change it too).
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
  return () => mo.disconnect();
}
const getPalette = (): Palette => (document.documentElement.dataset.palette === "day" ? "day" : "night");

/**
 * Light/dark switch. The new palette spreads out from the button in a circle,
 * like dye through cloth (View Transitions + a clip-path on the new snapshot).
 * Instant when the browser lacks View Transitions or the visitor prefers
 * reduced motion. "Follow London's time" stays available in the command menu.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const palette = useSyncExternalStore(subscribe, getPalette, () => "night" as Palette);
  const next: Palette = palette === "night" ? "day" : "night";

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    track("palette_command", { kind: "palette" });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) {
      applyPalette(next);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const root = document.documentElement;
    root.dataset.themeSwitch = "";
    const transition = document.startViewTransition(() => applyPalette(next));
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(0.77, 0, 0.175, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
    transition.finished.finally(() => delete root.dataset.themeSwitch);
  }

  const label = next === "day" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`press inline-flex min-h-11 min-w-11 items-center justify-center rounded-[7px] text-ink-muted transition-colors duration-150 hover:text-ink ${className}`}
    >
      {/* A uli ring, half dyed: the dyed half sits on the side the page will turn to. */}
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" className="uli-line" />
        <path
          d={palette === "night" ? "M12 3.5a8.5 8.5 0 0 1 0 17z" : "M12 3.5a8.5 8.5 0 0 0 0 17z"}
          fill="currentColor"
          className="text-accent"
        />
      </svg>
    </button>
  );
}
