import { renderOg, ogSize } from "@/lib/og";
import { caseStudies, getCaseStudy } from "@/content/projects";

export const alt = "Case study by Christian Onovo";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCaseStudy(slug)!;
  return renderOg({ title: c.name, subtitle: c.oneLine, glyph: c.glyph });
}
