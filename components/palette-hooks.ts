"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";

/** Light hooks for the command palette; the palette itself (cmdk) loads on first open. */
export const loadCommandPalette = () => import("@/components/command-palette");

const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
export function useShortcutLabel() {
  return useSyncExternalStore(
    () => () => {},
    () => (isMac() ? "⌘K" : "Ctrl K"),
    () => "⌘K",
  );
}

export function useCommandPalette() {
  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);
  const setOpen = useCallback((next: boolean) => {
    if (next && !openRef.current) track("palette_opened", {});
    openRef.current = next;
    setOpenState(next);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setOpen(!openRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
  return { open, setOpen };
}
