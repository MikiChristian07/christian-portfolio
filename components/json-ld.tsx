import { person } from "@/content/person";
import { roles, education } from "@/content/career";
import type { CaseStudy } from "@/content/projects";

/** Serialises JSON-LD safely: "<" is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function personJsonLd() {
  const current = roles.find((r) => r.end === null);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url: person.url,
    image: `${person.url}/img/christian-portrait.webp`,
    jobTitle: current?.title,
    worksFor: current ? { "@type": "Organization", name: current.org } : undefined,
    address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
    alumniOf: education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.org })),
    sameAs: [person.links.linkedin, person.links.github],
    knowsAbout: ["Software engineering", "Full-stack development", "AI agents", "Cybersecurity", "System architecture"],
  };
}

export function caseStudyJsonLd(c: CaseStudy) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: c.name,
    description: c.oneLine,
    url: `${person.url}/work/${c.slug}`,
    author: { "@type": "Person", name: person.name, url: person.url },
    keywords: c.stack.join(", "),
  };
}
