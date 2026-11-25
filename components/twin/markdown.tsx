import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

/**
 * Renders the twin's markdown. react-markdown never renders raw HTML, and
 * links are filtered: site-relative links become client navigations,
 * http(s) and mailto open normally, anything else (javascript:, data:) is
 * shown as plain text.
 */
const components: Components = {
  a({ href, children }) {
    if (!href) return <>{children}</>;
    if (href.startsWith("/") && !href.startsWith("//")) {
      return (
        <Link href={href} className="link">
          {children}
        </Link>
      );
    }
    if (/^(https?:|mailto:)/i.test(href)) {
      return (
        <a href={href} className="link" target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      );
    }
    return <>{children}</>;
  },
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-3">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-accent">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5 marker:text-ink-muted">{children}</ol>,
  h1: ({ children }) => <p className="mt-4 font-display text-lg first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mt-4 font-display text-lg first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mt-4 font-medium first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-ink/10 px-1">{children}</code>,
  img: () => null,
  table: () => null,
};

export function TwinMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown components={components} skipHtml>
      {children}
    </ReactMarkdown>
  );
}
