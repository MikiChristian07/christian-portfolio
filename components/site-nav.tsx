"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { person } from "@/content/person";
import { loadCommandPalette, useShortcutLabel } from "@/components/palette-hooks";
import { ThemeToggle } from "@/components/theme-toggle";

const sections = [
  { id: "work", label: "Work" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "research", label: "Research" },
  { id: "contact", label: "Contact" },
] as const;

/**
 * The section whose top has passed the middle of the viewport, or null above
 * the first one (the hero). Recomputed on scroll, once per frame.
 */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let current: string | null = null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= mid) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);
  return enabled ? active : null;
}

export function SiteNav({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const active = useActiveSection(onHome);
  const [menuOpen, setMenuOpen] = useState(false);
  const shortcut = useShortcutLabel();
  const listRef = useRef<HTMLUListElement>(null);
  const [bar, setBar] = useState({ x: 0, w: 0 });

  // Measure the active link after layout; the underline transitions to it.
  useLayoutEffect(() => {
    const link = active ? listRef.current?.querySelector<HTMLElement>(`a[href$="#${active}"]`) : null;
    const next = link ? { x: link.offsetLeft, w: link.offsetWidth } : { x: bar.x, w: 0 };
    if (next.x !== bar.x || next.w !== bar.w) setBar(next);
  }, [active, bar.x, bar.w]);

  // Close the mobile menu on navigation (derived during render, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ground/85 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-ground">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[90rem] items-center gap-8 px-5 md:px-[4.5rem]">
        <Link href="/" className="flex items-center gap-3 font-medium tracking-[-0.01em]">
          <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="13" cy="13" r="11" className="uli-line" />
            <path d="M6 13h14M13 6v14" className="uli-line" data-accent="" />
          </svg>
          {person.name}
        </Link>

        <ul ref={listRef} className="relative hidden items-center gap-7 text-sm md:flex">
          {/* One underline that slides between sections (CSS transform, no animation library). */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1.35rem] left-0 h-px origin-left bg-accent transition-[transform,opacity] duration-300 ease-[var(--ease-out)]"
            style={{ width: 1, transform: `translateX(${bar.x}px) scaleX(${bar.w})`, opacity: bar.w ? 1 : 0 }}
          />
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <Link
                  href={onHome ? `#${s.id}` : `/#${s.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={isActive ? "text-ink" : "text-ink-muted transition-colors duration-150 hover:text-ink"}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/ask"
              aria-current={pathname === "/ask" ? "page" : undefined}
              className={pathname === "/ask" ? "text-ink" : "text-ink-muted transition-colors duration-150 hover:text-ink"}
            >
              Ask the twin
            </Link>
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {onOpenPalette ? (
            <button
              type="button"
              onClick={onOpenPalette}
              onPointerEnter={() => void loadCommandPalette()}
              onFocus={() => void loadCommandPalette()}
              className="press hidden rounded-md border border-rule-strong px-2.5 py-1 text-xs text-ink-muted md:inline-flex"
              aria-keyshortcuts="Meta+K Control+K"
            >
              <span className="sr-only">Search and commands, </span>
              <kbd className="font-sans">{shortcut}</kbd>
            </button>
          ) : null}
          <button
            type="button"
            className="press min-h-11 px-2 text-sm md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div id="mobile-menu" className="border-t border-rule px-5 pb-6 md:hidden">
          <ul className="flex flex-col">
            {[...sections, { id: "ask", label: "Ask the twin" }].map((s) => (
              <li key={s.id}>
                <Link
                  href={s.id === "ask" ? "/ask" : onHome ? `#${s.id}` : `/#${s.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-12 items-center border-b border-rule font-display text-2xl"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
