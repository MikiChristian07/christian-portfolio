import type { GlyphId } from "./glyphs";

/**
 * Case studies. Drafted from each repository's code, README and git history
 * (see docs/CONTENT-REVIEW.md for sources and for every claim awaiting
 * Christian's confirmation). No metrics are stated that the sources don't
 * contain. "outcomes" lists only things that can be checked.
 */
export type ArchNode = { id: string; label: string; detail: string };

export type CaseStudy = {
  slug: string;
  name: string;
  glyph: GlyphId;
  oneLine: string;
  period: string;
  role: string;
  team: string;
  problem: string;
  solution: string;
  contribution: string[];
  architecture: ArchNode[];
  stack: string[];
  decisions: { title: string; body: string }[];
  outcomes: string[];
  links: { label: string; href: string }[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "kordy",
    name: "Kordy",
    glyph: "kordy",
    oneLine: "An AI coordinator that finds cover when an event steward cancels.",
    period: "2026",
    role: "Solo: product, design, full-stack and AI integration",
    team: "Solo",
    problem:
      "When a steward cancels before an event, an agency coordinator has to find cover quickly: check who is available, trained for the role and free of clashing shifts, then invite them and keep the roster straight.",
    solution:
      "Kordy is a multi-tenant web app for event staffing agencies, with an AI coordinator inside each agency's workspace. Its first complete workflow is shift cover: Kordy checks the agency's records, recommends eligible cover and drafts the invitation. The coordinator edits and approves it, confirms the assignment, and every step is written to an activity log.",
    contribution: [
      "Designed and built the product end to end, from sign-up and workspaces to the cover desk.",
      "Integrated the OpenAI Responses API with strict, read-only function tools.",
      "Built the tenancy model, sessions and rate limiting.",
      "Wrote the Vitest suite, with each test file on its own in-memory Postgres.",
    ],
    architecture: [
      { id: "ui", label: "Next.js 16 app", detail: "App Router, TypeScript. Cover desk, Ask Kordy sidebar, Kordy's work panel." },
      { id: "gate", label: "Membership gate", detail: "Every /api/w/[slug] route and workspace page calls one requireMembership check first." },
      { id: "ai", label: "Kordy agent", detail: "OpenAI Responses API with strict read-only tools, scoped to the caller's workspace." },
      { id: "db", label: "Postgres", detail: "PGlite locally, any Postgres in production. Composite foreign keys per workspace." },
      { id: "log", label: "Approvals and activity log", detail: "Kordy proposes; a coordinator approves. Each step is logged." },
    ],
    stack: ["Next.js 16", "TypeScript", "Postgres", "PGlite", "OpenAI Responses API", "zod", "Upstash Redis", "Vitest"],
    decisions: [
      {
        title: "The agent can read, never write",
        body: "Kordy's tools are read-only. Anything that changes a roster goes through a coordinator's approval, so a bad answer costs a review, not a wrong booking.",
      },
      {
        title: "Tenancy enforced twice",
        body: "Every query filters by workspace, and child rows reference parents through composite foreign keys, so the database itself refuses a cross-agency row even if application code slips.",
      },
      {
        title: "Same 404 for 'not yours' and 'doesn't exist'",
        body: "A user who isn't a member gets exactly the response a missing workspace gets, so other agencies' workspaces can't be discovered.",
      },
      {
        title: "Fail visibly",
        body: "When live AI calls fail, the cover desk shows the error with Retry and a switch to simulated mode. It never substitutes a canned answer.",
      },
    ],
    outcomes: [
      "The shift-cover workflow runs end to end in both simulated and live modes.",
      "Lint, typecheck, tests and build run as one check command.",
    ],
    links: [],
  },
  {
    slug: "insight-hub",
    name: "Insight Hub",
    glyph: "insight-hub",
    oneLine: "TalaTech's signed-in dashboard for client analytics, marketing performance and web support.",
    period: "Nov 2025 – Jan 2026",
    role: "Technical lead (as TalaTech CTO): reviewed and shipped the team's work",
    team: "Three engineers",
    problem:
      "TalaTech's clients needed one signed-in place to see how their web presence is doing and to get support, instead of separate reports and messages.",
    solution:
      "A Next.js dashboard with overview, analytics, marketing performance, impact, web support, team management and settings pages. Access is protected at the edge, and data comes from TalaTech's admin and client APIs.",
    contribution: [
      "Led the three-person build as CTO, reviewing and merging pull requests and promoting releases from staging to production.",
      "Fixed API endpoint issues during integration.",
      "Merged the React Flight security update when Vercel flagged it.",
    ],
    architecture: [
      { id: "ui", label: "Next.js dashboard", detail: "App Router, TypeScript, Tailwind. Pages per client job." },
      { id: "proxy", label: "Edge route protection", detail: "proxy.ts checks the session cookie, redirects to sign-in and back, handles the OAuth callback." },
      { id: "data", label: "React Query + axios", detail: "Separate admin and client API base URLs, cached on the client." },
      { id: "forms", label: "Forms", detail: "react-hook-form with zod schemas." },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "TanStack Query", "axios", "react-hook-form", "zod", "Motion"],
    decisions: [
      {
        title: "Protect routes before rendering",
        body: "Signed-out visitors are redirected at the edge with their destination remembered, so no protected page renders for them, even briefly.",
      },
      {
        title: "Staging, then production",
        body: "Work landed through feature branches into staging and was promoted to production by pull request, keeping a reviewable trail of every release.",
      },
    ],
    outcomes: ["Shipped to production through a staging branch, with 57 pull-request merges handled by Christian."],
    links: [],
  },
  {
    slug: "titleflow",
    name: "Titleflow",
    glyph: "titleflow",
    oneLine: "A platform for title work: marketplace, projects, documents, earnings and teams.",
    period: "Jan – Feb 2026",
    role: "Team lead and CTO",
    team: "Five engineers",
    problem:
      "Title work involves many parties, documents and payments. Titleflow brings the marketplace, project set-up, documents, earnings and team management into one product.",
    solution:
      "A customer frontend and an admin frontend in Next.js 16, backed by an Express and MongoDB service with real-time updates, deployed to AWS through infrastructure as code.",
    contribution: [
      "Led the five-person team as CTO.",
      "Owned releases from staging to production on the frontend.",
    ],
    architecture: [
      { id: "fe", label: "Customer app", detail: "Next.js 16, TypeScript, Tailwind 4, Radix primitives. Modules per job: marketplace, new project, documents, earnings, teams." },
      { id: "admin", label: "Admin app", detail: "Separate Next.js 16 frontend." },
      { id: "api", label: "Core service", detail: "Express, MongoDB (Mongoose), JWT and Google sign-in, Helmet, validated requests, file uploads." },
      { id: "rt", label: "Real-time", detail: "Ably for live updates." },
      { id: "infra", label: "AWS", detail: "Elastic Beanstalk, S3 and CloudFront from a CloudFormation template; CI/CD roles via GitHub OIDC." },
    ],
    stack: ["Next.js 16", "TypeScript", "Tailwind CSS 4", "Radix UI", "Express", "MongoDB", "Ably", "AWS Elastic Beanstalk", "CloudFormation"],
    decisions: [
      {
        title: "Separate admin and customer apps",
        body: "Admin tooling ships on its own frontend, so customer releases and admin changes don't block each other.",
      },
      {
        title: "Infrastructure in code, deploys without stored keys",
        body: "Environments are defined in CloudFormation, and CI deploys through GitHub OIDC roles rather than long-lived AWS keys.",
      },
    ],
    outcomes: [],
    links: [],
  },
];

/** Shipped client sites and earlier builds: shown as an index, not case studies. */
export const shippedSites = [
  { name: "Talatech.io", kind: "Company site", stack: "WordPress, Elementor", href: "https://talatech.io", image: "/work/talatech.webp", w: 1600, h: 784 },
  { name: "Raven & Macaw", kind: "Consulting firm site", stack: "Next.js, GraphQL, Tailwind", href: "https://ravenandmacaw.com", image: "/work/ravenandmacaw.webp", w: 1600, h: 784 },
  { name: "Montana Speedy Title", kind: "Title company site", stack: "WordPress, Elementor", href: "https://montanaspeedytitle.com/", image: "/work/mst.webp", w: 1600, h: 782 },
  { name: "EyeCare Merry Hill", kind: "Optician site revamp", stack: "WordPress, Elementor", href: "https://merryhill.ravenvision.co.uk/", image: "/work/merryhill.webp", w: 1600, h: 732 },
] as const;

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}
