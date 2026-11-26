import Link from "next/link";
import { ViewTransition } from "react";
import { person } from "@/content/person";
import { caseStudies } from "@/content/projects";
import { Glyph } from "@/components/glyph";
import { UliLine } from "@/components/uli-line";
import { HeroAsk } from "@/components/twin/hero-ask";
import { HeroHeadline } from "@/components/home/hero-headline";
import { BookCallLink } from "@/components/booking/book-call";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="relative mx-auto grid max-w-[90rem] grid-cols-1 gap-16 px-5 pt-16 pb-20 md:grid-cols-12 md:px-[4.5rem] md:pt-28 md:pb-28">

        <div className="md:col-span-7">
          {/*
            The page's one orchestrated moment. The line runs down the gutter
            beside the headline (sized to that block, so it never crosses type
            at any width), turns in the gap above the input and ends in a
            camwood knot at its right edge.
          */}
          <div className="relative">
            <UliLine
              className="pointer-events-none absolute -top-12 -left-11 hidden h-[calc(100%+3rem)] w-6 text-ink md:block"
              viewBox="0 0 24 1000"
              d="M14 0 C 4 180, 22 360, 12 540 S 6 860, 14 1000"
              duration={1.1}
            />
            <HeroHeadline />
            <p className="mt-8 max-w-[38ch] text-lg text-ink-muted">{person.summary}</p>
          </div>
          <div className="relative max-w-2xl">
            <UliLine
              className="pointer-events-none -ml-11 hidden h-10 w-[calc(100%+2.75rem)] text-ink md:block"
              viewBox="0 0 1000 40"
              d="M20 0 C 20 18, 48 24, 128 24 S 880 22, 968 26"
              accent="M968 26 c 10 -8 22 -6 24 3 c 2 9 -10 13 -18 8"
              delay={1.2}
              duration={0.7}
            />
            <div className="mt-10 md:mt-0">
              <HeroAsk />
            </div>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 font-medium">
            <li>
              <Link href="#work" className="link">
                See the work
              </Link>
            </li>
            <li>
              {person.cv ? (
                <a href={person.cv} className="link" download>
                  Download CV
                </a>
              ) : (
                <span className="text-ink-muted">CV: updated version coming soon</span>
              )}
            </li>
            <li>
              <Link href="#contact" className="link">
                Start a project
              </Link>
            </li>
            <li>
              <BookCallLink from="hero" className="link">
                Book a call
              </BookCallLink>
            </li>
          </ul>
        </div>

        <div className="md:col-span-5 md:pt-4">
          <h2 className="mb-4 text-sm text-ink-muted">Recent work, each with its own mark</h2>
          <ul className="border-t border-rule">
            {caseStudies.map((c) => (
              <li key={c.slug} className="border-b border-rule">
                <Link
                  href={`/work/${c.slug}`}
                  className="group grid grid-cols-[3.5rem_1fr] items-center gap-5 py-4 transition-colors duration-200 hover:bg-selected/40 focus-visible:bg-selected/40"
                >
                  <ViewTransition name={`glyph-${c.slug}`} share="morph" default="none">
                    <span className="block text-accent transition-colors group-hover:text-ink">
                      <Glyph id={c.glyph} />
                    </span>
                  </ViewTransition>
                  <span>
                    <span className="block font-display text-xl">{c.name}</span>
                    <span className="text-sm text-ink-muted">{c.oneLine}</span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="border-b border-rule">
              <Link href="#research" className="group grid grid-cols-[3.5rem_1fr] items-center gap-5 py-4 transition-colors duration-200 hover:bg-selected/40">
                <span className="block text-ink-muted">
                  <Glyph id="research" />
                </span>
                <span>
                  <span className="block font-display text-xl">Security research</span>
                  <span className="text-sm text-ink-muted">MSc Cybersecurity, post-quantum and smart-contract security</span>
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
