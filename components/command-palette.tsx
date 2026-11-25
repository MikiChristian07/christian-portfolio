"use client";

import { Command } from "cmdk";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { person } from "@/content/person";
import { caseStudies, shippedSites } from "@/content/projects";
import { useTwin } from "@/components/twin/twin-provider";
import { Glyph } from "@/components/glyph";
import { applyPalette, type PaletteChoice } from "@/components/palette-script";
import type { GlyphId } from "@/content/glyphs";
import { track } from "@/lib/analytics";

/**
 * Global Cmd/Ctrl+K palette. Opens and closes with no animation: it is a
 * keyboard tool people reach for repeatedly, so it must feel instant.
 * Anything typed can be asked of the twin directly.
 */

/**
 * Word-prefix matching instead of cmdk's fuzzy default, which matched "day"
 * against the letters of "dashboard analytics" and buried the palette options.
 * Every typed word must start a word in the item; earlier words (the name)
 * score higher; the "Ask my twin" fallback always sorts last.
 */
function filter(value: string, search: string) {
  if (value.startsWith("__ask__")) return 0.001;
  const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  const words = value.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
  let first = Infinity;
  for (const t of tokens) {
    const i = words.findIndex((w) => w.startsWith(t));
    if (i === -1) return 0;
    first = Math.min(first, i);
  }
  return 1 / (1 + first * 0.15);
}

const sections = [
  { id: "work", label: "Selected work" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "research", label: "Research" },
  { id: "contact", label: "Contact" },
] as const;

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { openPanel, send } = useTwin();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [palette, setPaletteChoice] = useState<PaletteChoice>("auto");

  // Reset transient state each time it opens (derived during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setCopied(false);
      const stored = localStorage.getItem("palette");
      setPaletteChoice(stored === "day" || stored === "night" ? stored : "auto");
    }
  }

  const close = () => onOpenChange(false);
  const go = (href: string) => {
    track("palette_command", { kind: href.startsWith("/work/") ? "project" : "navigate" });
    close();
    router.push(href);
  };
  const external = (href: string) => {
    track("palette_command", { kind: href.includes("linkedin") || href.includes("github") ? "profile" : "site" });
    close();
    window.open(href, "_blank", "noopener,noreferrer");
  };
  const ask = (q: string) => {
    close();
    if (pathname === "/ask") send(q, "palette");
    else openPanel(q, "palette");
  };
  const choosePalette = (c: PaletteChoice) => {
    track("palette_command", { kind: "palette" });
    applyPalette(c);
    setPaletteChoice(c);
  };

  const q = query.trim();

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command menu"
      shouldFilter
      filter={filter}
      loop
      overlayClassName="fixed inset-0 z-[70] bg-[rgb(6_9_18/0.55)]"
      contentClassName="fixed top-[12vh] left-1/2 z-[71] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[14px] border border-rule-strong bg-ground text-ink"
    >
      <div className="flex items-center gap-3 border-b border-rule px-5">
        <Glyph id="twin" size={20} className="shrink-0 text-accent" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search the site, or type a question for my twin"
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-ink-muted"
        />
        <kbd className="hidden shrink-0 rounded border border-rule-strong px-1.5 py-0.5 font-sans text-xs text-ink-muted sm:block">Esc</kbd>
      </div>

      <Command.List className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-muted">
        <Command.Empty className="px-3 py-6 text-sm text-ink-muted">
          Nothing on the site matches.
        </Command.Empty>

        <Command.Group heading="Go to">
          <Item value="home homepage start" glyph="twin" onSelect={() => go("/")}>
            Home
          </Item>
          {sections.map((s) => (
            <Item key={s.id} value={`section ${s.label}`} onSelect={() => go(`/#${s.id}`)}>
              {s.label}
            </Item>
          ))}
          <Item value="twin full screen talk ask chat conversation" glyph="twin" onSelect={() => go("/ask")}>
            Talk to my twin, full screen
          </Item>
        </Command.Group>

        <Command.Group heading="Work">
          {caseStudies.map((c) => (
            <Item
              key={c.slug}
              value={`project ${c.name} ${c.oneLine} ${c.stack.join(" ")}`}
              glyph={c.glyph}
              onSelect={() => go(`/work/${c.slug}`)}
              hint={c.period}
            >
              {c.name}
            </Item>
          ))}
          {shippedSites.map((s) => (
            <Item key={s.name} value={`site client ${s.name} ${s.kind} ${s.stack}`} glyph="sites" onSelect={() => external(s.href)} hint="Opens the site">
              {s.name}
            </Item>
          ))}
        </Command.Group>

        <Command.Group heading="Contact and profiles">
          <Item
            value="copy email address contact"
            onSelect={async () => {
              try {
                await navigator.clipboard.writeText(person.contact.email);
                setCopied(true);
              } catch {
                external(`mailto:${person.contact.email}`);
              }
            }}
            hint={copied ? "Copied" : person.contact.email}
          >
            {copied ? "Email address copied" : "Copy my email address"}
          </Item>
          <Item value="write email message send" onSelect={() => go("/#contact")}>
            Send me a message
          </Item>
          <Item value="cv resume download" disabled hint="Coming soon">
            Download my CV
          </Item>
          <Item value="linkedin profile" onSelect={() => external(person.links.linkedin)} hint="linkedin.com">
            LinkedIn
          </Item>
          <Item value="github code profile repositories" onSelect={() => external(person.links.github)} hint="github.com">
            GitHub
          </Item>
        </Command.Group>

        <Command.Group heading="Palette">
          {(
            [
              ["auto", "Follow London's time", "theme auto time"],
              ["day", "Day: cotton", "theme light day"],
              ["night", "Night: indigo", "theme dark night"],
            ] as const
          ).map(([value, label, keywords]) => (
            <Item key={value} value={`palette ${keywords}`} onSelect={() => choosePalette(value)} hint={palette === value ? "Current" : undefined}>
              {label}
            </Item>
          ))}
        </Command.Group>

        {/* Last, so site matches win Enter; a question that matches nothing still lands here first. */}
        {q ? (
          <Command.Group heading="Ask">
            <Item value={`__ask__ ${q}`} forceMount glyph="twin" onSelect={() => ask(q)}>
              Ask my twin: <span className="text-ink">&ldquo;{q}&rdquo;</span>
            </Item>
          </Command.Group>
        ) : null}
      </Command.List>

      <div className="flex justify-between gap-4 border-t border-rule px-5 py-2.5 text-xs text-ink-muted">
        <span>
          <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move, <kbd className="font-sans">Enter</kbd> to open
        </span>
        <span>Questions go to my AI twin</span>
      </div>
    </Command.Dialog>
  );
}

function Item({
  children,
  value,
  onSelect,
  glyph,
  hint,
  disabled,
  forceMount,
}: {
  children: React.ReactNode;
  value: string;
  onSelect?: () => void;
  glyph?: GlyphId;
  hint?: string;
  disabled?: boolean;
  forceMount?: boolean;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      forceMount={forceMount}
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[7px] px-3 py-2 text-sm text-ink-muted data-[disabled=true]:cursor-default data-[disabled=true]:opacity-50 data-[selected=true]:bg-selected data-[selected=true]:text-ink"
    >
      <span className="flex w-5 shrink-0 justify-center text-accent" aria-hidden="true">
        {glyph ? <Glyph id={glyph} size={18} /> : <span className="size-1 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="shrink-0 text-xs text-ink-muted">{hint}</span> : null}
    </Command.Item>
  );
}
