import "server-only";
import { person } from "@/content/person";
import { caseStudies, shippedSites } from "@/content/projects";
import { education, expertise, formatMonth, research, roles } from "@/content/career";

/**
 * The twin's knowledge. Same sources as the Render twin (summary.txt and the
 * LinkedIn export), with the phone number removed as Christian decided, plus
 * the site's own verified content so answers and the page never disagree.
 */

// digital-twin/summary.txt, verbatim.
const summary = `My name is Christian Onovo. I'm an entrepreneur, software engineer and ethical hacker. I'm originally from Enugu, Nigeria, but I moved to London in 2026.
I love playing basketball, football and chess.`;

// digital-twin/linkedin.pdf, transcribed. Phone number deliberately omitted.
const linkedin = `Christian Onovo
CTO @ Talatech
London, England, United Kingdom
LinkedIn: ${person.links.linkedin}
Top skills: Real-time Data Acquisition, Course Design, Elementor

Summary
As a software engineer, I am actively looking for innovations to grow alongside in my field. Over the course of my studies I have developed strong coding skills, enjoyed collaboration and teamwork skills and discovered a variety of interests that I have used to maximize my potential. I excel under pressure, am multi-tasking oriented as I continually stay in-tuned with the latest tech trends and practices. I look forward to working with you.

Experience
TalaTech.io, Chief Technology Officer, March 2025 to present, United States.
Raven & Macaw, Web Developer, January 2025 to January 2026, Abuja, Nigeria. Developed custom websites. Built full-stack web applications. Managed databases for optimized data handling. Automated deployments and CI/CD pipelines.
FMG Nigeria, Web Developer, March 2024 to December 2024. Designed, developed, and maintained the company's website and affiliated platforms. Customized WordPress themes and plugins to align with brand identity. Managed and secured WordPress sites, implementing best practices. Optimized website performance, SEO, and page speed. Installed and configured third-party plugins and themes.
Foretrust Digital Consults LTD, Web Developer, September 2023 to January 2024. Taught web development fundamentals, covering frontend and backend technologies. Designed structured course materials, projects, and resources. Provided one-on-one mentorship and hands-on project guidance. Assessed student progress through practical assignments and tests.
Genesys Tech Hub, Software Engineer, March 2022 to November 2022, Enugu State, Nigeria.

Education
Northumbria University, London: Master of Science, Cybersecurity (January 2026 to January 2027).
Coal City University: Bachelor of Science, Computer Science (September 2019 to July 2023).`;

function siteContent() {
  const studies = caseStudies
    .map(
      (c) => `### ${c.name} (page: /work/${c.slug})
${c.oneLine}
Period: ${c.period}. Role: ${c.role}. Team: ${c.team}.
Problem: ${c.problem}
What was built: ${c.solution}
Christian's contribution: ${c.contribution.join(" ")}
Architecture: ${c.architecture.map((a) => `${a.label} (${a.detail})`).join("; ")}
Stack: ${c.stack.join(", ")}
Key decisions: ${c.decisions.map((d) => `${d.title}: ${d.body}`).join(" ")}
Verified outcomes: ${c.outcomes.length ? c.outcomes.join(" ") : "None published yet."}`,
    )
    .join("\n\n");

  return `## Case studies on this website
${studies}

## Client websites shipped (section: /#sites)
${shippedSites.map((s) => `${s.name}: ${s.kind}, built with ${s.stack}. ${s.href}`).join("\n")}

## Roles (section: /#experience)
${roles.map((r) => `${r.title}, ${r.org} (${formatMonth(r.start)} to ${r.end ? formatMonth(r.end) : "now"}, ${r.place}): ${r.points.join(" ")}`).join("\n")}

## Education
${education.map((e) => `${e.title}, ${e.org} (${e.status})`).join("\n")}

## Areas of expertise
${expertise.map((x) => `${x.title}: ${x.body}`).join("\n")}

## Research (section: /#research). Nothing is published yet.
${research.map((r) => `${r.title} (${r.status}): ${r.body}`).join("\n")}

## Contact and CV
Contact form and email on the website: /#contact. Email: ${person.contact.email}. LinkedIn: ${person.links.linkedin}. GitHub: ${person.links.github}.
CV: ${person.cv ? `downloadable at ${person.cv}` : "an updated CV is coming soon; until then, point people to LinkedIn or the contact form."}`;
}

export const knowledge = `# Summary
${summary}

# LinkedIn profile
${linkedin}

# Website content
${siteContent()}`;
