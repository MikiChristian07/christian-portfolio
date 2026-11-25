import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { glyphs, type GlyphId } from "@/content/glyphs";

/** Shared social-share card: indigo ground, cotton Gloock title, the item's mark in camwood. */
export const ogSize = { width: 1200, height: 630 };

const gloock = readFile(join(process.cwd(), "assets/fonts/Gloock-Regular.ttf"));
const schibsted = readFile(join(process.cwd(), "assets/fonts/SchibstedGrotesk-Regular.woff"));

export async function renderOg({ title, subtitle, glyph }: { title: string; subtitle: string; glyph: GlyphId }) {
  const g = glyphs[glyph];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0e1424",
          color: "#ede6d6",
          fontFamily: "Schibsted",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: "#ada79a" }}>
          <svg width="40" height="40" viewBox="0 0 26 26">
            <circle cx="13" cy="13" r="11" fill="none" stroke="#ede6d6" strokeWidth="1.6" />
            <path d="M6 13h14M13 6v14" stroke="#d0603f" strokeWidth="1.6" />
          </svg>
          christianonovo.com
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ fontFamily: "Gloock", fontSize: title.length > 40 ? 76 : 96, lineHeight: 1.02, letterSpacing: "-0.02em" }}>
              {title}
            </div>
            <div style={{ marginTop: 28, fontSize: 32, lineHeight: 1.35, color: "#ada79a" }}>{subtitle}</div>
          </div>
          <svg width="220" height="220" viewBox="0 0 56 56">
            {g.paths.map((d) => (
              <path key={d} d={d} fill="none" stroke="#d0603f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {g.dot ? <circle cx={g.dot[0]} cy={g.dot[1]} r="2.6" fill="#d0603f" /> : null}
          </svg>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Schibsted", data: await schibsted, style: "normal", weight: 400 },
        { name: "Gloock", data: await gloock, style: "normal", weight: 400 },
      ],
    },
  );
}
