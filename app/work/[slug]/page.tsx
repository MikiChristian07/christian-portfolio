import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { caseStudies, getCaseStudy } from "@/content/projects";
import { Glyph } from "@/components/glyph";
import { JsonLd, caseStudyJsonLd } from "@/components/json-ld";
import { TrackCaseStudyView } from "@/components/track-view";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) return {};
  return {
    title: `${c.name} case study`,
    description: c.oneLine,
    alternates: { canonical: `/work/${c.slug}` },
    openGraph: { title: `${c.name}: a case study by Christian Onovo`, description: c.oneLine, url: `/work/${c.slug}` },
  };
}

const shell = "mx-auto max-w-[90rem] px-5 md:px-[4.5rem]";

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) notFound();
  const index = caseStudies.findIndex((x) => x.slug === c.slug);
  const next = caseStudies[(index + 1) % caseStudies.length]!;

  return (
    <article data-twin-context={`case-study:${c.slug}`}>
      <JsonLd data={caseStudyJsonLd(c)} />
      <TrackCaseStudyView slug={c.slug} />
      <header className={`${shell} grid gap-10 pt-16 pb-20 md:grid-cols-12 md:pt-24`}>
        <div className="md:col-span-2">
          <ViewTransition name={`glyph-${c.slug}`} share="morph" default="none">
            <span className="block w-fit text-accent">
              <Glyph id={c.glyph} size={96} title={`${c.name} mark`} />
            </span>
          </ViewTransition>
        </div>
        <div className="md:col-span-8">
          <p className="text-sm text-ink-muted">
            <Link href="/#work" className="link">
              Selected work
            </Link>{" "}
            / {c.period}
          </p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">{c.name}</h1>
          <p className="mt-6 max-w-[44ch] text-xl text-ink-muted">{c.oneLine}</p>
          <dl className="mt-10 grid gap-6 border-t border-rule pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-ink-muted">My role</dt>
              <dd className="mt-1">{c.role}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Team</dt>
              <dd className="mt-1">{c.team}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Built with</dt>
              <dd className="mt-1">{c.stack.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section aria-labelledby="problem" className="border-t border-rule">
        <div className={`${shell} grid gap-10 py-20 md:grid-cols-12`}>
          <h2 id="problem" className="font-display text-2xl md:col-span-3 md:col-start-3">
            The problem
          </h2>
          <p className="max-w-[60ch] text-lg md:col-span-6">{c.problem}</p>
          <h2 className="font-display text-2xl md:col-span-3 md:col-start-3">{c.team === "Solo" ? "What I built" : "What we built"}</h2>
          <p className="max-w-[60ch] text-lg text-ink-muted md:col-span-6">{c.solution}</p>
          <h2 className="font-display text-2xl md:col-span-3 md:col-start-3">What I did</h2>
          <ul className="max-w-[60ch] list-disc space-y-2 pl-5 text-ink-muted marker:text-accent md:col-span-6">
            {c.contribution.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="architecture" className="border-t border-rule bg-field/30">
        <div className={`${shell} py-20`}>
          <h2 id="architecture" className="font-display text-3xl md:ml-[calc(100%/12*2)]">
            Architecture
          </h2>
          {/* A flow, read top to bottom: each layer hands off to the next. */}
          <ol className="relative mt-12 md:ml-[calc(100%/12*2)] md:max-w-[52rem]">
            {c.architecture.map((n, i) => (
              <li key={n.id} className="relative grid gap-2 pb-10 pl-10 last:pb-0 md:grid-cols-[14rem_1fr] md:gap-8">
                <span aria-hidden="true" className="absolute top-1.5 left-0 size-3 rounded-full border-2 border-accent" />
                {i < c.architecture.length - 1 ? (
                  <span aria-hidden="true" className="absolute top-5 bottom-0 left-[5px] w-px bg-rule-strong" />
                ) : null}
                <h3 className="font-medium">{n.label}</h3>
                <p className="text-ink-muted">{n.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="decisions" className="border-t border-rule">
        <div className={`${shell} py-20`}>
          <h2 id="decisions" className="font-display text-3xl md:ml-[calc(100%/12*2)]">
            Decisions I&apos;d defend in review
          </h2>
          <ul className="mt-12 grid gap-x-12 gap-y-10 md:ml-[calc(100%/12*2)] md:grid-cols-2">
            {c.decisions.map((d) => (
              <li key={d.title} className="border-t border-rule-strong pt-5">
                <h3 className="font-display text-xl">{d.title}</h3>
                <p className="mt-3 text-ink-muted">{d.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-16 md:ml-[calc(100%/12*2)]">
            <h2 className="font-display text-2xl">Outcomes</h2>
            {c.outcomes.length ? (
              <ul className="mt-4 max-w-[60ch] list-disc space-y-2 pl-5 text-ink-muted marker:text-accent">
                {c.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 max-w-[60ch] text-ink-muted">No public outcomes yet. I&apos;ll add them when they can be checked.</p>
            )}
            {c.links.length ? (
              <ul className="mt-6 flex gap-6">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="link" target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <nav aria-label="Next case study" className="border-t border-rule">
        <Link href={`/work/${next.slug}`} className={`${shell} group flex items-center gap-6 py-14`}>
          <span className="text-ink-muted">Next</span>
          <ViewTransition name={`glyph-${next.slug}`} share="morph" default="none">
            <span className="text-ink transition-colors group-hover:text-accent">
              <Glyph id={next.glyph} size={48} />
            </span>
          </ViewTransition>
          <span className="font-display text-3xl">{next.name}</span>
        </Link>
      </nav>
    </article>
  );
}
