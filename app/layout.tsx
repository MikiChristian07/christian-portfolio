import type { Metadata, Viewport } from "next";
import { Gloock, Schibsted_Grotesk } from "next/font/google";
import { person } from "@/content/person";
import { PaletteScript } from "@/components/palette-script";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/home/sections";
import "./globals.css";

const gloock = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock", display: "swap" });
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(person.url),
  title: { default: `${person.name}: engineer, CTO and ethical hacker`, template: `%s · ${person.name}` },
  description: `${person.summary} Ask his digital twin anything about his work.`,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: person.name,
    locale: "en_GB",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e1424" },
    { media: "(prefers-color-scheme: light)", color: "#ede6d6" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-palette="night" suppressHydrationWarning className={`${gloock.variable} ${schibsted.variable}`}>
      <head>
        <PaletteScript />
      </head>
      <body className="grain min-h-dvh bg-ground text-ink">
        <a
          href="#main"
          className="sr-only z-50 rounded bg-ink px-4 py-2 text-ground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteChrome>
          <main id="main">{children}</main>
          <SiteFooter />
        </SiteChrome>
      </body>
    </html>
  );
}
