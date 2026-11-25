import Image from "next/image";
import Link from "next/link";
import { person } from "@/content/person";
import { caseStudies, shippedSites } from "@/content/projects";
import { education, expertise, formatMonth, research, roles } from "@/content/career";
import { Glyph } from "@/components/glyph";
import { UliLine } from "@/components/uli-line";
import { WorkRow } from "@/components/home/work-row";
import { ContactForm } from "@/components/home/contact-form";

function SectionHead({ id, title, intro }: { id: string; title: string; intro?: string }) {
  return (
    <div className="mb-12 grid gap-4 md:grid-cols-12">
      <h2 id={`${id}-title`} className="font-display text-3xl md:col-span-5 md:text-4xl">
        {title}
      </h2>
      {intro ? <p className="max-w-[52ch] text-lg text-ink-muted md:col-span-6 md:col-start-7 md:pt-3">{intro}</p> : null}
    </div>
  );
}

const shell = "mx-auto max-w-[90rem] px-5 md:px-[4.5rem]";

export function WorkSection() {
  return (
    <section id="work" aria-labelledby="work-title" className={`${shell} py-24 md:py-36`}>
      <SectionHead
        id="work"
        title="Selected work"
        intro="Three products, told as engineering decisions rather than screenshots. Open one to see the problem, the architecture and what I'd defend in review."
      />
      <ul className="border-t border-rule">
        {caseStudies.map((c) => (
          <WorkRow key={c.slug} study={c} />
        ))}
      </ul>

      <div id="sites" className="mt-28 scroll-mt-24">
        <h3 className="font-display text-2xl">Shipped for clients</h3>
        <p className="mt-3 max-w-[52ch] text-ink-muted">Live sites for real businesses. Each link opens the site itself.</p>
        <ul className="mt-10 grid gap-x-10 gap-y-14 md:grid-cols-2">
          {shippedSites.map((s) => (
            <li key={s.name}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="group block">
                <span className="block overflow-hidden border border-rule">
                  <Image
                    src={s.image}
                    width={s.w}
                    height={s.h}
                    alt={`Homepage of ${s.name}`}
                    sizes="(min-width: 768px) 40vw, 100vw"
                    className="h-auto w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.015]"
                  />
                </span>
                <span className="mt-4 flex items-baseline justify-between gap-4">
                  <span className="font-display text-xl">{s.name}</span>
                  <span className="text-sm text-ink-muted">{s.stack}</span>
                </span>
                <span className="text-sm text-ink-muted">
                  {s.kind} <span className="sr-only">(opens in a new tab)</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative border-t border-rule bg-field/30">
      <div className={`${shell} grid gap-14 py-24 md:grid-cols-12 md:py-36`}>
        <div className="md:col-span-4">
          {/* Hard crop: a narrow window on the photo, not a polite headshot. */}
          <div className="relative aspect-[3/4] max-w-[16rem] overflow-hidden">
            <Image
              src="/img/christian-portrait.webp"
              alt="Christian Onovo standing by a river in London, smiling, in a dark jacket"
              fill
              sizes="(min-width: 768px) 30vw, 90vw"
              className="object-cover object-[50%_30%]"
              priority={false}
            />
          </div>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <h2 id="about-title" className="font-display text-3xl md:text-4xl">
            Builder first. Then the person who tries to break it.
          </h2>
          <div className="mt-8 space-y-5 text-lg text-ink-muted max-w-[60ch]">
            <p>
              I&apos;m Christian, CTO at TalaTech. I grew up in Enugu, Nigeria, started shipping websites for businesses there and in
              Abuja, and moved to London in 2026 to study for an MSc in Cybersecurity at Northumbria.
            </p>
            <p>
              Most of my work is taking a product from an idea to something people use: the data model, the interface, the deploy, and
              the team doing it. I care about the boring parts that keep it standing, like who can see which record and what happens when
              the AI is wrong.
            </p>
            <p>Away from the screen: basketball, football and chess.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" aria-labelledby="experience-title" className={`${shell} py-24 md:py-36`}>
      <SectionHead id="experience" title="Experience" intro="Most recent first: from CTO today back to my first engineering role in Enugu." />
      <ol className="relative md:ml-[calc(100%/12*2)]">
        {/* The timeline is one line with a knot per role. */}
        <UliLine
          className="pointer-events-none absolute top-0 bottom-0 left-[0.6rem] hidden h-full w-6 text-rule-strong md:block"
          viewBox="0 0 24 1000"
          d="M12 0 C 4 120, 20 220, 12 340 S 4 560, 12 680 S 20 880, 12 1000"
        />
        {roles.map((r) => (
          <li key={r.org} className="relative grid gap-3 border-b border-rule py-10 md:grid-cols-[14rem_1fr] md:pl-14">
            <span aria-hidden="true" className={`absolute top-12 left-[0.4rem] hidden size-3.5 rounded-full border-2 md:block ${r.end ? "border-ink-muted bg-ground" : "border-accent bg-accent"}`} />
            <p className="text-sm text-ink-muted">
              <span className="tabular-nums">
                <time dateTime={r.start}>{formatMonth(r.start)}</time> – {r.end ? <time dateTime={r.end}>{formatMonth(r.end)}</time> : "Now"}
              </span>
              <br />
              {r.place}
            </p>
            <div>
              <h3 className="font-display text-2xl">
                {r.title}, {r.org}
              </h3>
              <ul className="mt-4 max-w-[62ch] list-disc space-y-1.5 pl-5 text-ink-muted marker:text-rule-strong">
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <h3 className="mt-20 font-display text-2xl md:ml-[calc(100%/12*2)] md:pl-14">Education</h3>
      <ul className="mt-6 md:ml-[calc(100%/12*2)] md:pl-14">
        {education.map((e) => (
          <li key={e.title} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-4">
            <span>
              <span className="font-medium">{e.title}</span>, {e.org}
            </span>
            <span className="text-sm text-ink-muted tabular-nums">
              {formatMonth(e.start)} – {formatMonth(e.end)} · {e.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExpertiseSection() {
  return (
    <section aria-labelledby="expertise-title" className="border-t border-rule">
      <div className={`${shell} py-24 md:py-36`}>
        <SectionHead id="expertise" title="What I can own" intro="Each area links to the work that shows it." />
        <ul className="grid gap-x-16 md:grid-cols-2">
          {expertise.map((x) => (
            <li key={x.title} className="grid content-start grid-cols-[2.75rem_1fr] gap-x-5 gap-y-2 border-t border-rule py-7">
              <Glyph id={x.glyph} size={40} className="row-span-3 text-accent" />
              <h3 className="font-display text-2xl">{x.title}</h3>
              <p className="max-w-[48ch] text-ink-muted">{x.body}</p>
              <p className="flex flex-wrap gap-x-4 text-sm">
                {x.evidence.map((e) => (
                  <Link key={e.href + e.label} href={e.href} className="link">
                    {e.label}
                  </Link>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ResearchSection() {
  return (
    <section id="research" aria-labelledby="research-title" className={`${shell} py-24 md:py-36`}>
      <SectionHead
        id="research"
        title="Research"
        intro="Where I'm studying and experimenting. Findings appear here when there are findings; nothing below is published yet."
      />
      <ul className="grid gap-10 md:grid-cols-3">
        {research.map((r) => (
          <li key={r.title} className="border-t border-rule-strong pt-6">
            <h3 className="font-display text-2xl">{r.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {r.org} · <span className="text-accent">{r.status}</span>
            </p>
            <p className="mt-4 text-ink-muted">{r.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="border-t border-rule bg-field/30">
      <div className={`${shell} grid gap-14 py-24 md:grid-cols-12 md:py-36`}>
        <div className="md:col-span-5">
          <h2 id="contact-title" className="font-display text-3xl md:text-4xl">
            Start a conversation
          </h2>
          <p className="mt-6 max-w-[40ch] text-lg text-ink-muted">
            Building a product, hiring, or researching something close to mine? Write to me and I&apos;ll reply myself.
          </p>
          <dl className="mt-10 space-y-4">
            <div>
              <dt className="text-sm text-ink-muted">Email</dt>
              <dd>
                <a href={`mailto:${person.contact.email}`} className="link">
                  {person.contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Elsewhere</dt>
              <dd className="flex gap-6">
                <a href={person.links.linkedin} className="link" rel="me noopener" target="_blank">
                  LinkedIn
                </a>
                <a href={person.links.github} className="link" rel="me noopener" target="_blank">
                  GitHub
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className={`${shell} flex flex-col gap-3 py-10 text-sm text-ink-muted md:flex-row md:justify-between`}>
        <p>
          {person.name}, {person.location}.
        </p>
        <p>The marks on this site were drawn for it, after uli line work from south-eastern Nigeria.</p>
      </div>
    </footer>
  );
}
