/**
 * Authored marks, drawn for this site in the manner of uli line work:
 * single-weight strokes, curves that close on themselves, generous empty space.
 * They are original geometry, not transcriptions of nsibidi or any society's
 * signs. Christian approves or replaces each mark before launch.
 *
 * Every mark is drawn on a 56 x 56 box and rendered with the .uli-line stroke.
 */
export type GlyphId =
  | "kordy"
  | "insight-hub"
  | "titleflow"
  | "sites"
  | "research"
  | "engineering"
  | "ai"
  | "security"
  | "architecture"
  | "product"
  | "leadership"
  | "chain"
  | "twin";

export const glyphs: Record<GlyphId, { label: string; paths: string[]; dot?: [number, number] }> = {
  kordy: { label: "Kordy", paths: ["M8 40C20 8 36 8 48 40", "M18 30h20"], dot: [28, 44] },
  "insight-hub": { label: "Insight Hub", paths: ["M10 28h36M28 10v36", "M16 16c8 8 16 8 24 0"] },
  titleflow: { label: "Titleflow", paths: ["M10 14h36M10 28h24M10 42h36", "M40 22l6 6-6 6"] },
  sites: { label: "Client sites", paths: ["M10 12h36v32H10z", "M10 22h36", "M18 32c4-4 8-4 12 0s8 4 12 0"] },
  research: { label: "Research", paths: ["M28 12a16 16 0 1 1 0 32a16 16 0 1 1 0-32", "M28 12v32", "M14 36c8-8 20-8 28 0"] },
  engineering: { label: "Software engineering", paths: ["M12 18l10 10-10 10", "M28 40h16"] },
  ai: { label: "AI and automation", paths: ["M28 10c10 0 18 8 18 18s-8 18-18 18", "M28 46c-10 0-18-8-18-18", "M22 28h12"], dot: [28, 28] },
  security: { label: "Cybersecurity", paths: ["M28 8l16 6v12c0 10-7 18-16 22c-9-4-16-12-16-22V14z", "M22 28l5 5 9-10"] },
  architecture: { label: "System architecture", paths: ["M12 14h12v12H12zM32 30h12v12H32z", "M24 20h8v10"] },
  product: { label: "Product engineering", paths: ["M10 44c6-20 14-30 18-30s12 10 18 30", "M20 32h16"] },
  leadership: { label: "Technical leadership", paths: ["M28 8v40", "M14 22l14-14 14 14", "M18 40h20"] },
  chain: { label: "Blockchain and post-quantum security", paths: ["M10 22h14v12H10zM32 22h14v12H32z", "M24 28h8", "M17 22v-6M39 34v6"] },
  twin: { label: "Digital twin", paths: ["M18 12a10 10 0 1 0 0.1 0", "M38 24a10 10 0 1 0 0.1 0", "M18 22c0 10 20 4 20 14"] },
};
