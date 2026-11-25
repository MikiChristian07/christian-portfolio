import Link from "next/link";
import { Glyph } from "@/components/glyph";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-[90rem] flex-col justify-center gap-6 px-5 md:px-[4.5rem]">
      <Glyph id="twin" size={72} className="text-accent" />
      <h1 className="font-display text-4xl">This page isn&apos;t on the record.</h1>
      <p className="max-w-[48ch] text-lg text-ink-muted">The link may be old. Start from the homepage, or ask Miki, my AI assistant, what you were looking for.</p>
      <p className="flex gap-6">
        <Link href="/" className="link">Go to the homepage</Link>
        <Link href="/ask" className="link">Ask Miki</Link>
      </p>
    </section>
  );
}
