import type { MetadataRoute } from "next";
import { person } from "@/content/person";
import { caseStudies } from "@/content/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: person.url, changeFrequency: "monthly", priority: 1 },
    { url: `${person.url}/ask`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${person.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...caseStudies.map((c) => ({ url: `${person.url}/work/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
