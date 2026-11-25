# Phase 1 and 2: Discovery, audit and proposed architecture

Status: approved 2026-11-25. Direction: Uli Cipher. Architecture: Next.js on Vercel, with the twin moved into the site (see section 5, which supersedes the Render-based plan in section 3).

## 1. Existing portfolio (this repo)

| Area | Finding | Consequence |
|---|---|---|
| Stack | Vite 4, React 18, JS (no TS), Tailwind 3, framer-motion 9, three/R3F/drei, react-router 6 (unused routing), swiper, react-parallax-tilt, react-vertical-timeline, EmailJS | Client-rendered SPA: one `<title>`, no per-page metadata, nothing for crawlers without JS |
| Origin | JS Mastery "3D portfolio" template, lightly edited | The look and structure are the template's, so a redesign replaces rather than polishes |
| Hero 3D | `public/desktop_pc` is 16 MB, loaded on first paint | Largest single performance cost on the site |
| Testimonials | Placeholder text praising "Rick", `randomuser.me` photos, fake companies | Fabricated; removed in any direction |
| Experience | All four roles share the same four boilerplate bullets; titles and dates differ from LinkedIn (e.g. Genesys ends Aug vs Nov 2022; TalaTech CTO role missing) | Rewrite from LinkedIn export, the verified source |
| Contact form | EmailJS call passes `to_name: "JavaScript Mastery"` and `to_email: "sujata@jsmastery.pro"` | Template leftover. Whether mail reaches Christian depends on the EmailJS template config. Must be checked |
| Featured projects | Insight Hub, Tytlflow (Titleflow), Kordy absent; Vue Jobs card tags say React/Sanity | Content to be rebuilt from repos |
| Reusable | Project screenshots in `src/assets` (large PNGs, need AVIF/WebP), company logos, EmailJS env wiring, Vercel config | Keep the assets, re-encode them |
| Stray file | `vite.config.js.timestamp-*.mjs` untracked | Safe to delete; left untouched |

## 2. Digital twin (`Documents/digital-twin`, deployed on Render)

Verified by reading the code and calling the live service on 2026-11-25.

- Gradio 6.32 `ChatInterface` around `chat(message, history)`, OpenAI `gpt-5.4-mini`, tool loop with `record_user_details` and `record_unknown_question` (both send a Pushover notification).
- Knowledge: `summary.txt` (two lines) and `linkedin.pdf` (includes mobile number and personal email).
- Public API contract (from `/gradio_api/info` and a real call):
  - `POST /gradio_api/call/v2/chat` body `{"message": "..."}` returns `{"event_id": "..."}`
  - `GET /gradio_api/call/chat/{event_id}` returns SSE: one `event: complete` with `data: ["<markdown>", null]`
  - No history parameter on the public endpoint, so each API call is a fresh conversation.
  - No token streaming: `chat` returns a full string.
- Latency: 61 s cold start (Render free tier sleeps), ~3 s warm.
- No authentication: anyone can call the endpoint directly, bypassing any proxy rate limit and spending OpenAI credit.

### Security gaps against CLAUDE.md section 6

| Requirement | Today | Fix |
|---|---|---|
| No private info | Phone number in the knowledge base | Strip phone before building the prompt (decided) |
| Rate limiting, abuse prevention | None; public endpoint | Shared-secret header from the Vercel proxy, plus per-IP limits at the proxy |
| Validate requests | None | Proxy validates length, roles and turn count with zod; backend re-checks |
| Unauthorized tool execution | Model-chosen args go straight to Pushover | Validate email format, cap notifications per session |
| Prompt injection via history | Gradio UI history is client-held | New endpoint accepts only `user`/`assistant` turns, capped, never `system` |
| Email capture consent | Silent | Visible consent line in the chat UI (decided) |

## 3. Proposed technical architecture

### Frontend: migrate to Next.js (App Router) + TypeScript

Why change a working stack: the brief needs per-page metadata, Open Graph, JSON-LD, sitemap, descriptive case-study URLs, `/ask`, and a server-side API proxy. A Vite SPA can do none of that without bolting on SSR and a separate function layer. Every component is being replaced by the redesign anyway, so the migration cost is mostly the cost of the redesign. Christian's recent projects (Insight Hub, Titleflow, Kordy) are already Next.js.

Dependencies:
- Keep: React, Tailwind, Motion (the current `framer-motion` renamed), EmailJS (fixed).
- Add: `cmdk` (command palette), `lucide-react`, `zod`, a markdown renderer with sanitisation (`react-markdown` without raw HTML).
- Remove: three, R3F, drei, maath (16 MB model), swiper, react-parallax-tilt, react-vertical-timeline.
- Lenis: not proposed; native scroll is better for accessibility unless a direction needs it.

Content lives in typed files (`content/projects/*.ts`, `content/experience.ts`), so the page, JSON-LD and the twin's suggested links share one source.

### Twin integration

```
Browser ──> /api/twin (Vercel route handler) ──> Render twin
            validate (zod), per-IP rate limit,        shared-secret check,
            timeout + retry, add page context         history + context aware
```

- Client: a `TwinProvider` holds one session (sessionStorage) shared by the hero prompt, the persistent assistant and `/ask`. Compound components (`Twin.Thread`, `Twin.Composer`, `Twin.Suggestions`), not boolean-prop variants.
- Cold start: the proxy pings the twin when the page loads and shows "Waking up, this can take up to a minute" with the static answers still on the page. No fake typing animation.
- Failure: every twin answer has an on-page equivalent; on error the UI says what failed and links to the section that answers the question.

### Backend changes needed (twin repo, need approval)

The public Gradio endpoint cannot carry history or page context. Smallest change that keeps the agent intact:
1. Mount a FastAPI route next to Gradio (`gr.mount_gradio_app`): `POST /v1/chat` taking `{messages, context}`, reusing the same `chat` logic, prompt and tools. The Gradio UI keeps working.
2. Require an `X-Twin-Key` shared secret on that route.
3. Optionally stream tokens (OpenAI `stream=True`) over SSE; the proxy passes it through.
4. Strip the phone number from the knowledge base and add a no-private-info rule to the prompt.

### Hosting decisions for Christian

- Render free tier sleeps after inactivity (61 s cold start measured). Options: Render Starter instance (no sleep, paid) or accept the cold start and handle it in the UI.
- Rate-limit store: per-instance memory is weak on serverless; Upstash Redis (free tier) is the usual fix. Needs approval as a new service.
- Analytics: PostHog only with approval; no conversation content captured by default.

## 4. Blockers and open questions

1. Titleflow: Christian's role (3 commits on the frontend; CTO oversight?).
2. Research: no source material for post-quantum or blockchain research beyond practice Solidity contracts.
3. CV: which PDF is current (several in `Documents/Pdf shii`).
4. Contact form: confirm the EmailJS template actually delivers to Christian.
5. Twin backend change and shared secret: approval to edit the twin repo.
6. Render plan and Upstash: approval for paid or new services.

## 5. Decision: the twin moves to Vercel (2026-11-25)

Christian chose to move the twin into the website instead of keeping it on Render.

Why: Render's free tier sleeps (61 s cold start measured), its Gradio endpoint was public and unauthenticated, and its public API carried no history. The twin's logic is small (one prompt, two knowledge files, two notification tools), so porting it cost less than securing and warming a second service.

What moved, unchanged in purpose:
- Model: `gpt-5.4-mini` (override with `OPENAI_MODEL`).
- Prompt rules: role, professional scope, never invent, record unknown questions, markdown style.
- Knowledge: `summary.txt` and the LinkedIn export (phone removed), plus this site's verified content.
- Tools: `record_user_details`, `record_unknown_question`, both Pushover.

What changed:
- `/api/twin` (Node runtime): same-origin check, zod validation (user/assistant roles only, 24 turns, 1,000 characters per question), Upstash limits (20 per visitor per 10 minutes, 400 per day overall, fails closed in production), 45 s model timeout, max 3 tool rounds, tool arguments validated, one contact record and two unknown-question alerts per request.
- Streaming NDJSON (`delta`, `done`, `error`), multi-turn history from the client's session, page context sent as an allowlisted id only.
- Prompt hardened: first person only, no private info, not a general assistant, instructions cannot be changed by the user.
- Markdown rendered without raw HTML; links limited to site paths, http(s) and mailto.

Verified locally: streaming answers in about 3 s; page context resolves "this project"; refuses phone and address requests and prompt-leak attempts; forged system roles, oversized messages and foreign origins rejected; unknown questions trigger the tool; Upstash keys written; UI flows checked in headless Chrome (hero, assistant panel, /ask on mobile, offline error state).

The Render service still runs and can be shut down whenever Christian chooses; nothing on the site depends on it.
