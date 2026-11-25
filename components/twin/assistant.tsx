"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTwin } from "./twin-provider";
import { Glyph } from "@/components/glyph";

const loadPanel = () => import("./assistant-panel");
const AssistantPanel = dynamic(loadPanel, { ssr: false });

/**
 * The persistent assistant: a discreet mark in the corner that opens a panel
 * holding the shared conversation. A side panel on desktop, a bottom sheet
 * on phones. Escape closes it and focus returns to the trigger.
 */
export function Assistant() {
  const { panelOpen, openPanel, closePanel, status } = useTwin();
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const onAsk = pathname === "/ask";
  const [panelUsed, setPanelUsed] = useState(false);
  if (panelOpen && !panelUsed) setPanelUsed(true);

  // The hero input is the same conversation: don't show a second entry point
  // (or cover hero text on phones) while it's on screen.
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-q");
    if (!hero) {
      setHeroVisible(false); // eslint-disable-line react-hooks/set-state-in-effect -- reset when the route has no hero
      return;
    }
    const io = new IntersectionObserver(([e]) => setHeroVisible(!!e?.isIntersecting), { rootMargin: "0px 0px -15% 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePanel();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, closePanel]);

  // The full-screen page already is the conversation.
  useEffect(() => {
    if (onAsk && panelOpen) closePanel();
  }, [onAsk, panelOpen, closePanel]);

  if (onAsk) return null;

  return (
    <>
      {panelUsed ? <AssistantPanel onClose={() => { closePanel(); triggerRef.current?.focus(); }} /> : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (panelOpen ? closePanel() : openPanel())}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-expanded={panelOpen}
        aria-label={panelOpen ? "Close the twin" : "Ask my twin"}
        className={`press fixed right-5 bottom-5 z-50 items-center gap-2.5 rounded-full border border-rule-strong bg-ground py-2.5 pr-4 pl-3 sm:right-6 sm:bottom-6 ${panelOpen ? "hidden sm:flex" : heroVisible ? "hidden" : "flex"}`}
      >
        <span className={status === "streaming" ? "text-accent twin-thinking" : "text-accent"}>
          <Glyph id="twin" size={22} />
        </span>
        <span className="text-sm font-medium">{panelOpen ? "Close" : "Ask"}</span>
      </button>
    </>
  );
}
