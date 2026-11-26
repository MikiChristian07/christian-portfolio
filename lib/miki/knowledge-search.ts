import { caseStudies, shippedSites } from "@/content/projects";
import { education, expertise, research, roles } from "@/content/career";
import { person } from "@/content/person";

/**
 * search_knowledge_base: a structured lookup over the site's verified content.
 * Miki's full knowledge is already in its prompt; this returns the most relevant
 * facts with the page link to cite, so answers can point to the right place.
 */
type Doc = { title: string; text: string; link: string };

const docs: Doc[] = [
  ...caseStudies.map((c) => ({
    title: c.name,
    link: `/work/${c.slug}`,
    text: [c.oneLine, c.problem, c.solution, c.role, c.contribution.join(" "), c.stack.join(", "), c.decisions.map((d) => `${d.title}: ${d.body}`).join(" ")].join(" "),
  })),
  ...roles.map((r) => ({ title: `${r.title}, ${r.org}`, link: "/#experience", text: `${r.title} ${r.org} ${r.place} ${r.points.join(" ")}` })),
  ...education.map((e) => ({ title: e.title, link: "/#experience", text: `${e.title} ${e.org} ${e.status}` })),
  ...expertise.map((x) => ({ title: x.title, link: x.evidence[0]?.href ?? "/", text: `${x.title} ${x.body}` })),
  ...research.map((r) => ({ title: r.title, link: "/#research", text: `${r.title} ${r.org} ${r.status} ${r.body}` })),
  ...shippedSites.map((s) => ({ title: s.name, link: "/#sites", text: `${s.name} ${s.kind} ${s.stack}` })),
  { title: "Contact", link: "/#contact", text: `contact email ${person.contact.email} linkedin github book a call meeting` },
];

const words = (s: string) => s.toLowerCase().match(/[a-z0-9.+#]+/g) ?? [];

export function searchKnowledge(query: string, limit = 3) {
  const q = new Set(words(query).filter((w) => w.length > 2));
  if (!q.size) return [];
  return docs
    .map((d) => {
      const hay = words(`${d.title} ${d.text}`);
      const score = hay.reduce((n, w) => n + (q.has(w) ? 1 : 0), 0) + words(d.title).filter((w) => q.has(w)).length * 3;
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ d }) => ({ title: d.title, link: d.link, excerpt: d.text.slice(0, 600) }));
}
