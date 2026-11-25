import { glyphs, type GlyphId } from "@/content/glyphs";

type GlyphProps = {
  id: GlyphId;
  size?: number;
  className?: string;
  /** Decorative by default; pass a title when the mark carries meaning on its own. */
  title?: string;
};

export function Glyph({ id, size = 56, className, title }: GlyphProps) {
  const g = glyphs[id];
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {g.paths.map((d) => (
        <path key={d} d={d} className="uli-line" />
      ))}
      {g.dot ? <circle cx={g.dot[0]} cy={g.dot[1]} r={2.6} fill="currentColor" /> : null}
    </svg>
  );
}
