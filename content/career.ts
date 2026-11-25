import type { GlyphId } from "./glyphs";

/** Dates and titles from LinkedIn (source of truth). Bullets from Christian's CV, in his words. */
export const roles = [
  {
    org: "TalaTech",
    title: "Chief Technology Officer",
    start: "2025-03",
    end: null,
    place: "Remote (US company)",
    points: [
      "Leads engineering for TalaTech's client products, including Insight Hub and Titleflow.",
      "Runs the staging-to-production release flow across team repositories.",
    ],
  },
  {
    org: "Raven & Macaw",
    title: "Web Developer",
    start: "2025-01",
    end: "2026-01",
    place: "Abuja, Nigeria",
    points: [
      "Built and customised WordPress sites with Elementor and custom themes.",
      "Built full-stack applications with React, Node.js and Express.",
      "Managed MySQL, MongoDB and PostgreSQL databases.",
      "Automated deployments with GitHub Actions CI/CD.",
    ],
  },
  {
    org: "FMG Nigeria",
    title: "Web Developer",
    start: "2024-03",
    end: "2024-12",
    place: "Abuja, Nigeria",
    points: [
      "Designed, built and maintained the company website and affiliated platforms.",
      "Secured and hardened the WordPress estate.",
      "Improved performance, SEO and page speed.",
    ],
  },
  {
    org: "Foretrust Digital Consults",
    title: "Web Developer and Instructor",
    start: "2023-09",
    end: "2024-01",
    place: "Enugu, Nigeria",
    points: [
      "Taught frontend and backend web development fundamentals.",
      "Designed course materials and assessed students through practical projects.",
      "Mentored students one to one.",
    ],
  },
  {
    org: "Genesys Tech Hub",
    title: "Software Engineer",
    start: "2022-03",
    end: "2022-11",
    place: "Enugu, Nigeria",
    points: [
      "Built features with a team of engineers and took part in code review.",
      "Found and fixed bugs to improve stability.",
    ],
  },
] as const;

export const education = [
  { org: "Northumbria University, London", title: "MSc Cybersecurity", start: "2026-01", end: "2027-01", status: "In progress" },
  { org: "Coal City University, Enugu", title: "BSc Computer Science", start: "2019-09", end: "2023-07", status: "Completed" },
] as const;

/** Areas of expertise, each tied to evidence on this site. */
export const expertise: { glyph: GlyphId; title: string; body: string; evidence: { label: string; href: string }[] }[] = [
  { glyph: "engineering", title: "Software engineering", body: "TypeScript, JavaScript, Python and PHP across web and mobile, with React Native for apps.", evidence: [{ label: "Kordy", href: "/work/kordy" }] },
  { glyph: "product", title: "Full-stack and product", body: "Next.js and React on the front, Node, Express and Postgres or MongoDB behind, shipped as products rather than pages.", evidence: [{ label: "Titleflow", href: "/work/titleflow" }] },
  { glyph: "ai", title: "AI and agents", body: "Tool-using agents with guardrails: read-only tools, human approval, visible failure. This site's twin is one.", evidence: [{ label: "Kordy", href: "/work/kordy" }, { label: "Ask the twin", href: "/ask" }] },
  { glyph: "security", title: "Cybersecurity", body: "Ethical hacking, WordPress hardening, and an MSc in Cybersecurity in progress.", evidence: [{ label: "Research", href: "/#research" }] },
  { glyph: "architecture", title: "System architecture", body: "Multi-tenant data models, edge auth, infrastructure as code on AWS.", evidence: [{ label: "Kordy", href: "/work/kordy" }, { label: "Titleflow", href: "/work/titleflow" }] },
  { glyph: "leadership", title: "Technical leadership", body: "CTO at TalaTech: leads teams of three to five, reviews and ships their work.", evidence: [{ label: "Insight Hub", href: "/work/insight-hub" }] },
  { glyph: "sites", title: "Client web delivery", body: "Fast, maintainable sites for real businesses, mostly WordPress and Next.js.", evidence: [{ label: "Shipped sites", href: "/#sites" }] },
  { glyph: "chain", title: "Blockchain and post-quantum security", body: "Smart-contract practice in Solidity and research interest in post-quantum cryptography.", evidence: [{ label: "Research", href: "/#research" }] },
];

/** Research: only what exists. Findings are added when there are findings. */
export const research = [
  { title: "MSc Cybersecurity", org: "Northumbria University, London", status: "In progress, Jan 2026 – Jan 2027", body: "Postgraduate study in cybersecurity, started January 2026." },
  { title: "Post-quantum security", org: "Independent", status: "Exploring", body: "How systems built today can prepare for quantum-capable attackers. No published work yet." },
  { title: "Smart-contract security", org: "Independent", status: "Practice", body: "Solidity practice contracts (crowdfunding, inbox, lottery) used to study common contract flaws." },
] as const;

export function formatMonth(ym: string | null) {
  if (!ym) return "Now";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}
