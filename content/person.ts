/**
 * Single source of truth for who Christian is. Every page, the JSON-LD and the
 * twin's suggested links read from here. Sources: LinkedIn export
 * (digital-twin/linkedin.pdf) and the twin's summary.txt. Do not add claims
 * that are not in a source; add them to docs/CONTENT-REVIEW.md first.
 */
export const person = {
  name: "Christian Onovo",
  fullName: "Christian Chibuike Onovo",
  headline: "I build your product, then I try to break into it.",
  summary:
    "CTO at TalaTech. Software engineer and ethical hacker, studying for an MSc in Cybersecurity in London.",
  location: "London, United Kingdom",
  origin: "Enugu, Nigeria",
  currentRole: { title: "Chief Technology Officer", org: "TalaTech", since: "2025-03" },
  interests: ["Basketball", "Football", "Chess"],
  url: "https://www.christianonovo.com",
  links: {
    linkedin: "https://www.linkedin.com/in/christianonovo-2b6893198",
    github: "https://github.com/MikiChristian07",
  },
  contact: {
    // Public contact route chosen by Christian ("hide phone, keep email").
    email: "onovochristian19@gmail.com",
  },
  /** Set to a /public path once Christian supplies the updated CV (no street address or phone). */
  cv: null as string | null,
} as const;

export type Person = typeof person;
