"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { TwinProvider } from "@/components/twin/twin-provider";
import { Assistant } from "@/components/twin/assistant";
import { loadCommandPalette, useCommandPalette } from "@/components/palette-hooks";
import { initAnalytics } from "@/lib/analytics";

const CommandPalette = dynamic(loadCommandPalette, { ssr: false });

/**
 * Client shell around every page: navigation, the shared twin conversation,
 * the persistent assistant and the Cmd/Ctrl+K palette. Heavy pieces (palette,
 * chat panel, markdown) load on first use, not with the page.
 * Server-rendered children pass straight through.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandPalette();
  const [paletteUsed, setPaletteUsed] = useState(false);
  if (open && !paletteUsed) setPaletteUsed(true);
  useEffect(() => initAnalytics(), []);
  return (
    <TwinProvider>
      <SiteNav onOpenPalette={() => setOpen(true)} />
      {children}
      <Assistant />
      {paletteUsed ? <CommandPalette open={open} onOpenChange={setOpen} /> : null}
    </TwinProvider>
  );
}
