"use client";

import { track } from "@/lib/analytics";

/**
 * An external link that records which kind of destination was opened
 * (email, LinkedIn, GitHub, a client site), never the visitor.
 * A tiny client island, so the surrounding sections stay server-rendered.
 */
export function TrackedLink({
  kind,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "target"> & { kind: "email" | "linkedin" | "github" | "shipped_site" }) {
  const external = !props.href?.startsWith("mailto:");
  return <a {...props} target={external ? "_blank" : undefined} onClick={() => track("outbound_click", { target: kind })} />;
}
