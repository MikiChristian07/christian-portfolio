# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: founders and companies looking for a technical partner, fractional CTO, or someone to build and ship their product. They arrive from a referral, LinkedIn or a Talatech conversation, usually on a laptop between meetings, and need to decide quickly whether Christian can own their build end to end.

Secondary (served, not optimised for first): engineering leads and recruiters hiring for software, AI or security roles in the UK; academic and security researchers interested in his MSc work.

## Product Purpose

A single personal site that merges Christian Onovo's portfolio with his AI digital twin. Visitors can learn who he is, inspect his work as engineering case studies, and question the twin about his background without leaving the site. Success: a founder leaves knowing what Christian builds, trusting that he can lead the technical side, and with a clear way to start a conversation (contact or CV).

## Positioning

The site is not only described; it answers back. A founder can interrogate Christian's experience through his own agent, which is grounded in his real record and admits what it does not know. That is the same kind of AI-native product he builds for clients (see Kordy), so the site doubles as a working demonstration.

## Operating Context

- Portfolio: this repo (Vite, React 18, Tailwind 3, framer-motion, react-three-fiber), deployed on Vercel at christianonovo.com.
- Digital twin: separate repo `MikiChristian07/digital-twin`, a Gradio 6.32 app on Render (`digital-twin-mtyb.onrender.com`) calling OpenAI `gpt-5.4-mini` with two tools (record contact interest, record unknown question) that notify Christian via Pushover.
- Verified twin API contract: `POST /gradio_api/call/v2/chat {message}` returns `{event_id}`, then `GET /gradio_api/call/chat/{event_id}` returns one SSE `complete` event with a markdown string. Single message, no history parameter, no token streaming. Measured: ~61s cold start, ~3s warm.

## Capabilities and Constraints

- The twin must keep its existing intelligence, knowledge base and tools; the Render backend is retained unless a justified change is approved.
- The portfolio must remain fully usable when the twin is down or cold.
- Twin privacy (confirmed): the phone number is removed from what the twin can see; visitors are routed to the contact form or a public email; email capture stays, with visible consent.
- Approved 2026-11-25 (supersedes the Render plan): the twin moves into this site as a Vercel route handler (`/api/twin`), same model, prompt rules, knowledge and two Pushover tools; streaming, multi-turn, page-aware. The Render Gradio app is no longer a dependency.
- Approved 2026-11-25: migrate the portfolio to Next.js + TypeScript.
- Approved services: Upstash Redis (rate limiting), PostHog (no conversation content by default).
- The CV download shows "coming soon" until Christian supplies an updated PDF without street address or phone.

## Brand Commitments

- Name: Christian Onovo. Based in London since 2026, originally from Enugu, Nigeria.
- Self-description from his own summary: entrepreneur, software engineer and ethical hacker.
- Never fabricate metrics, testimonials, clients or achievements.

## Evidence on Hand

Verified (from LinkedIn export `digital-twin/linkedin.pdf`):
- CTO, TalaTech.io, Mar 2025 to present.
- Web Developer, Raven & Macaw, Jan 2025 to Jan 2026.
- Web Developer, FMG Nigeria, Mar 2024 to Dec 2024.
- Web Developer / instructor, Foretrust Digital Consults, Sep 2023 to Jan 2024.
- Software Engineer, Genesys Tech Hub, Mar 2022 to Nov 2022.
- MSc Cybersecurity, Northumbria University London, Jan 2026 to Jan 2027.
- BSc Computer Science, Coal City University, 2019 to 2023.

Projects with local source (case studies to be drafted from code, every unverified claim marked, then reviewed by Christian):
- Insight Hub (`Documents/Talatech/talatech-insight-hub`): Talatech analytics and marketing dashboard, Next.js, React Query, zod. Christian authored 57 of 114 commits, Nov 2025 to Jan 2026, team of three.
- Kordy (`Documents/oss`): multi-tenant AI staffing coordinator, Next.js 16, Postgres, OpenAI Responses API. Solo.
- Titleflow (`Documents/Talatech/titleflow`): Next.js frontend, admin and Express/Mongo backend, team of five. Christian's role (confirmed): team lead / CTO.
- CV (Christian Onovo Resume(1).pdf, supplied 2026-11-25): outdated (no TalaTech), differs from LinkedIn on dates; LinkedIn wins. Adds verified skills list: React, React Native, TypeScript, Next.js, Node/Express, MySQL, MongoDB, PostgreSQL, PHP, Python, WordPress/WooCommerce, GitHub Actions CI/CD.
- Shipped client sites: Raven & Macaw, Talatech.io, Montana Speedy Title, EyeCare Merry Hill. Older demos: Shop-API, Vue Jobs.
- Web3 practice contracts (`Documents/web3`): crowdfunding, inbox, lottery.

Absent, must not be invented: research publications or findings (post-quantum and blockchain research has no source yet), testimonials (the current ones are template placeholders and will be removed), outcome metrics for any project, a current CV PDF (several old versions exist in `Documents/Pdf shii`; Christian to choose).

## Product Principles

1. Proof over adjectives: every claim on the page links to work, code or the twin's grounded answer.
2. The twin is a way in, not a gate: everything it knows is also readable on the page.
3. Honest about limits: unknowns are stated, never filled.
4. One conversation, everywhere: the hero prompt, persistent assistant and /ask share one session.

## Accessibility & Inclusion

WCAG 2.2 AA. Full keyboard operation (including Cmd/Ctrl+K and the chat), screen reader support for streamed or loading replies, and prefers-reduced-motion respected.
