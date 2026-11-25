import { caseStudies } from "@/content/projects";

/**
 * Page context the client may send with a question. Only these ids are
 * accepted; the server turns an id into a fixed sentence, so no visitor-
 * controlled text ever reaches the system prompt through this channel.
 */
const sectionLabels = {
  home: "the top of the homepage",
  "section:work": "the Selected work section",
  "section:about": "the About section",
  "section:experience": "the Experience section",
  "section:research": "the Research section",
  "section:contact": "the Contact section",
  ask: "the full-screen Ask page",
} as const;

export type TwinContextId = keyof typeof sectionLabels | `case-study:${string}`;

export function describeContext(id: string | undefined): string | null {
  if (!id) return null;
  if (id in sectionLabels) return `The visitor is currently viewing ${sectionLabels[id as keyof typeof sectionLabels]}.`;
  if (id.startsWith("case-study:")) {
    const study = caseStudies.find((c) => `case-study:${c.slug}` === id);
    if (study)
      return `The visitor is currently reading the ${study.name} case study (/work/${study.slug}). If they say "this project", "it" or "this", they mean ${study.name}.`;
  }
  return null;
}

/** Client side: work out where the visitor is right now. */
export function currentContextId(): TwinContextId {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname;
  if (path === "/ask") return "ask";
  const study = path.match(/^\/work\/([a-z0-9-]+)$/);
  if (study) return `case-study:${study[1]}`;
  const mid = window.innerHeight / 2;
  for (const id of ["contact", "research", "experience", "about", "work"] as const) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < mid) return `section:${id}`;
  }
  return "home";
}
