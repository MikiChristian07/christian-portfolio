"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { CaseStudy } from "@/content/projects";
import { Glyph } from "@/components/glyph";

/** A case study's summary face. It opens in place; the full study lives at /work/[slug]. */
export function WorkRow({ study }: { study: CaseStudy }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li className="border-b border-rule">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="group grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-5 py-7 text-left md:grid-cols-[5rem_1.2fr_1fr_auto] md:gap-8"
        >
          <span className={open ? "text-accent" : "text-ink transition-colors duration-200 group-hover:text-accent"}>
            <Glyph id={study.glyph} size={56} />
          </span>
          <span>
            <span className="block font-display text-2xl md:text-3xl">{study.name}</span>
            <span className="block text-ink-muted md:hidden">{study.oneLine}</span>
          </span>
          <span className="hidden text-ink-muted md:block">{study.oneLine}</span>
          <span aria-hidden="true" className="text-sm text-ink-muted">
            {open ? "Close" : "Open"}
          </span>
        </button>
      </h3>
      {/* Closed panels stay in the DOM (inert) so the grid-rows transition can run both ways. */}
      <div id={panelId} className="disclose" data-open={open ? "" : undefined} inert={!open}>
        <div>
            <div className="grid gap-8 pb-10 md:grid-cols-[5rem_1.2fr_1fr] md:gap-8">
              <div className="hidden md:block" />
              <div className="space-y-4">
                <p className="text-lg">{study.problem}</p>
                <p className="text-ink-muted">{study.solution}</p>
              </div>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-ink-muted">My role</dt>
                  <dd>{study.role}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Team and period</dt>
                  <dd>
                    {study.team}, {study.period}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Built with</dt>
                  <dd>{study.stack.join(", ")}</dd>
                </div>
                <div className="pt-2">
                  <dt className="sr-only">Case study</dt>
                  <dd>
                    <Link href={`/work/${study.slug}`} className="link font-medium">
                      Read the {study.name} case study
                    </Link>
                  </dd>
                </div>
              </dl>
            </div>
        </div>
      </div>
    </li>
  );
}
