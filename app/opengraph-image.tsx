import { renderOg, ogSize } from "@/lib/og";
import { person } from "@/content/person";

export const alt = `${person.name}: ${person.headline}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ title: person.headline, subtitle: person.summary, glyph: "twin" });
}
