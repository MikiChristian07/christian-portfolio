# Miki V2: technical plan

Status: decisions made 2026-11-25, awaiting go-ahead to implement. Source spec: `MIKI_V2_SPEC.md`.

**Decisions:**
- Email uses the **Gmail API**.
- **No new services:** no QStash, Resend or Pub/Sub. Scheduling is **GitHub Actions every 15 min + traffic-triggered checks + a daily Vercel Cron backstop**.
- **Booking defaults** accepted as proposed.
- **Pushover** is retired once Telegram is live.
- **Privacy notice** goes inside the booking dialog.
- **Google account:** `onovochristian19@gmail.com`.

## 1. Current architecture (audited)

| Area | What exists today | Reuse for V2 |
|---|---|---|
| Hosting | One Vercel project (`christian-portfolio`, Hobby) serves the site **and** the agent at `/api/twin`. The old `digital-twin` repo (Gradio, Render) is not used by the site. | Build everything in this project; leave `digital-twin` untouched. |
| Agent | `app/api/twin/route.ts`: OpenAI `gpt-5.4-mini`, streaming, tool loop (max 3 rounds), two Pushover tools. | Becomes Miki's **public** agent: same route, same UI. |
| Knowledge | Summary + LinkedIn text + site content in the system prompt (~3.4k tokens). **No RAG / vector store exists.** | Keep. `search_knowledge_base` becomes a structured lookup over `content/` returning facts and links. |
| Security | Same-origin check, zod validation, Upstash rate limits (fail closed), privacy-mode LLM analytics. | Same patterns for booking, webhooks and jobs. |
| Data store | **Upstash Redis** (rate limits). No SQL database, no user auth. | All V2 state goes in the same Redis. |
| Analytics | PostHog EU, cookieless; LLM analytics in privacy mode. | Query it for daily visitor counts (read-only personal key). |
| UI | Hero question box, assistant panel, `/ask`, Cmd+K palette; `DESIGN.md`. | Labels renamed only; one new component, the booking dialog, built from existing tokens and patterns. |
| Repo | GitHub `MikiChristian07/christian-portfolio`, **public**. | Free GitHub Actions minutes for the 15-min tick. Secrets live only in Vercel/GitHub settings. |

## 2. Architecture

```
Website (public)                                    Telegram (private, owner only)
  Hero / panel / /ask ──► /api/twin (public Miki)      You ──► /api/telegram (webhook)
  Book a call dialog ──► /api/booking/*                         │ secret header + owner user id + chat id
            │                                                   │ update_id dedupe; owner agent + buttons
            ▼                                                   ▼
     lib/miki/booking ◄──────────────── lib/miki/owner (private tools, confirm-before-execute)
     lib/miki/google  (OAuth, FreeBusy, Events + Meet, Gmail send/read)
     lib/miki/store   (Upstash Redis: requests, enquiries, threads, settings, audit)
            ▲
  /api/jobs/tick  ◄── GitHub Actions every 15 min (Bearer JOB_SECRET)
                  ◄── site traffic (throttled to once per 10 min globally)
                  ◄── your Telegram activity
                  ◄── Vercel Cron, daily backstop + retention cleanup
  tick = check PostHog milestones + poll Gmail for replies on Miki threads + expire stale requests
```

**Separation is enforced in code, not prompts:**
- `/api/twin` only ever receives public tool definitions.
- Owner tools are imported only by `/api/telegram`, after the owner checks pass.
- Irreversible actions (accept, decline, reschedule, send email, disable bookings) never run from model output. The model can only create a *pending action*, shown as a Telegram card with Confirm/Cancel. Code executes it on your press, exactly once.

## 3. Feature design

### 3.1 Miki rebrand (copy and prompt only; no visual change)
- **Labels:**
  - "Ask my twin" / "Ask the twin" → **Ask Miki**
  - panel title → **Ask Miki**
  - hero note → "Miki, Christian's AI assistant. Answers from his real record and says when it doesn't know."
- **Metadata:** `/ask` title "Ask Miki: Christian's personal AI assistant". The hero headline is unchanged.
- **Voice:** Miki speaks as Christian's assistant in the **third person**, not as Christian, as the spec requires. Suggested questions move to the third person and add "Book a call with Christian".
- **Code:** internal `twin` names stay; only user-facing strings change.

### 3.2 Booking (one service, two entry points)
- **Dialog:** a Book a call dialog styled like the assistant panel. It opens from a "Book a call" link in the hero action row, the Contact section, the Cmd+K palette and Miki. No nav change, no new page.
- **Miki tools:** `get_public_availability`, `suggest_meeting_times` and `submit_meeting_request` call the same service.
- **Privacy:** availability comes only from Google **FreeBusy**. The public path never fetches event titles or attendees.
- **Settings** (Redis, editable via Telegram):
  - Mon–Fri 10:00–17:00 Europe/London
  - 30 or 60 min
  - 15 min buffer
  - 24 h minimum notice
  - 21-day horizon
  - bookings on/off, or off until a date
- **Visitor email verification:** a 6-digit code sent from your Gmail and entered in the dialog or chat. Only verified requests reach you.
- **Flow:**
  1. The visitor confirms explicitly.
  2. The request is saved as `pending` with a unique id.
  3. You get a Telegram card: Accept / Decline / Reschedule / Reply by email.
  4. The visitor sees "Request sent; Christian will confirm by email."
- **On Accept:**
  1. Recheck FreeBusy and lock the slot.
  2. Create the event with a Google Meet link and `sendUpdates=all`; the request id is the idempotency key.
  3. Verify the Meet link exists.
  4. Save the event id and link, then notify both sides.

  If the slot became busy, Miki offers up to three alternatives instead.
- **Reschedule:** you propose a time and Miki emails the visitor a signed accept link (an API route that confirms, then redirects to the site). The booking is created only after they accept.
- **States:** `unverified → pending → accepted | declined | reschedule_proposed → accepted | expired`. Every transition is audited.

### 3.3 Telegram (owner interface)
- **Webhook:** `/api/telegram` with Telegram's `secret_token`.
  - `update_id` is deduplicated for 24 h, since Telegram retries.
  - Immediate acknowledgement, with the work done in `after()`.
- **Commands:** `/pending`, `/meetings`, `/visitors`, `/settings`, `/help`, plus natural language through an owner agent with the private tools from the spec.
- **Ambiguity:** when a request is unclear, Miki asks which person or thread you mean, offering buttons.
- **Replay protection:** button payloads carry a one-time nonce, consumed atomically.

### 3.4 Email via Gmail API
- **Sending:** from `onovochristian19@gmail.com` with `gmail.send`, always after your Confirm in Telegram.
  - Replies use the right `threadId`, `In-Reply-To` and `References` headers, so they stay in the same Gmail thread.
  - Verification codes and reschedule links also go out this way.
- **Reply detection:** polling with `gmail.readonly`, **limited to thread ids Miki created**. It never lists or searches your inbox.
  - Each tick fetches only those threads' metadata. A new message from the visitor is read, converted to plain text, and relayed to Telegram with Reply / Ignore buttons.
  - Unrelated email is never read or forwarded.
- **Why polling, not push:** Gmail push needs Google Cloud Pub/Sub, which needs a billing account on the project. That's out of scope by your decision. Polling runs every 15 min via GitHub Actions, plus when you use Telegram, plus the daily backstop.
- **Records:** failures (bounces, API errors) come to Telegram, and every send is audited.

### 3.5 Daily visitor milestones
- **The query:** `count(DISTINCT distinct_id)` for `$pageview` on `$host = 'www.christianonovo.com'`, since London midnight, run via the PostHog query API.
  - Bot-flagged traffic is excluded.
  - Preview and localhost traffic is excluded by host.
  - Cookieless IDs rotate daily, which suits a per-day count. These are tracked browsers or devices, not people.
- **Owner exclusion:** `/optout` in Telegram gives a signed link. Opening it on your devices sets a local flag, and analytics are skipped there.
- **Notification:** "Miki — Website Activity: your portfolio has reached five distinct tracked visitors today."
  - Defaults: threshold 5, once per London day, plus optional extra milestones set via Telegram.
  - Each milestone is sent once per day, guaranteed by a Redis `SET NX` on `milestone:{date}:{n}`.
- **Triggers:** every tick (GitHub Actions 15 min), throttled site-traffic checks, `/visitors`, and the daily backstop.

## 4. Google permissions (minimum)

| Scope | Why | Class |
|---|---|---|
| `https://www.googleapis.com/auth/calendar.freebusy` | Free/busy blocks only, for public availability | Sensitive |
| `https://www.googleapis.com/auth/calendar.events` | Create accepted events with Meet and invites; list your upcoming events for `/meetings` | Sensitive |
| `https://www.googleapis.com/auth/gmail.send` | Send owner-approved emails and verification codes | Sensitive |
| `https://www.googleapis.com/auth/gmail.readonly` | Read **only Miki-managed threads** to detect replies. No narrower Google scope can read message bodies. | **Restricted** |

Deliberately **not** requested: `gmail.modify` (needed to apply a "Miki" label). Threads are tracked in Redis instead, so no label appears in Gmail.

- **Authorisation:** one-time owner OAuth. `/connect_google` in Telegram sends a signed single-use link. The refresh token is stored **encrypted (AES-256-GCM)** in Redis. There's no admin page.
- **Verification:** this is a personal-use app (only you sign in). Publish the consent screen as **In production, unverified**. You'll see Google's "unverified app" warning once; continue via **Advanced → Go to … (unsafe)**. This avoids Testing mode, whose refresh tokens expire every 7 days.
- **Restricted-scope caveat:** for `gmail.readonly`, Google may require verification even in production. If it refuses, the fallback is **Testing mode + a weekly reconnect reminder in Telegram** (one tap).

## 5. Environment variables (Vercel, server-only)

| Name | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Random 32+ chars; Telegram echoes it in a header |
| `OWNER_TELEGRAM_USER_ID`, `OWNER_TELEGRAM_CHAT_ID` | Only these may command Miki |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client (Web application) |
| `GOOGLE_CALENDAR_ID` | `primary` |
| `TOKEN_ENCRYPTION_KEY` | 32-byte key (base64) for stored OAuth tokens |
| `ACTION_SIGNING_SECRET` | Signs one-time links (connect, opt-out, reschedule acceptance) |
| `JOB_SECRET` | Bearer token for `/api/jobs/tick` (also stored as a GitHub Actions secret) |
| `CRON_SECRET` | Vercel Cron authorisation for the daily backstop |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` | Read-only query access for visitor counts |
| Existing | `OPENAI_API_KEY`, `UPSTASH_*`, `NEXT_PUBLIC_POSTHOG_*`, `NEXT_PUBLIC_EMAILJS_*` unchanged; `PUSHOVER_*` removed after cutover |

## 6. Data model (Upstash Redis, JSON values)

| Key | Contents | Retention |
|---|---|---|
| `miki:req:{id}` | meeting request (name, verified email, company, purpose, slot, tz, duration, state, eventId, meetLink, gmail threadId) | 90 days after the meeting |
| `miki:req:pending` (sorted set) | pending ids by time | n/a |
| `miki:enq:{id}` | professional enquiry | 90 days |
| `miki:thread:{gmailThreadId}` | mapping: request/enquiry id, message ids, last seen message, Telegram message id, state | 180 days |
| `miki:settings` | hours, durations, buffer, notice, horizon, bookings on/off, thresholds | permanent |
| `miki:google:token` | encrypted refresh token | until revoked |
| `miki:verify:{emailHash}` | hashed code + attempt count | 15 min |
| `miki:action:{nonce}` | pending owner action awaiting Confirm | 24 h |
| `miki:tg:update:{id}`, `miki:lock:slot:{start}`, `miki:tick:lock` | dedupe and locks | 24 h / 60 s / 10 min |
| `miki:milestone:{date}:{n}` | sent markers | 3 days |
| `miki:audit` (Redis stream) | privileged actions: who, what, when, result | last 5,000 |

No raw IPs are stored (rate-limit keys are short-lived), and no visitor details go to PostHog.

## 7. Vercel and scheduling limits

| Limit | Impact | Approach |
|---|---|---|
| Hobby cron: at most **once per day**, at any time within the hour | Can't drive timely alerts | GitHub Actions every 15 min (free, public repo); Vercel Cron kept as a daily backstop and for retention cleanup |
| GitHub scheduled workflows are best effort (often 5–20 min late) and pause after 60 days without repo activity | Alerts may be late; the schedule can lapse | Traffic and Telegram triggers fill the gaps; Miki warns on Telegram if no tick has run for 24 h |
| Functions up to 300 s | Fine | Acknowledge webhooks immediately, then `after()` |
| No background processes | n/a | Everything is webhook or tick driven; state lives in Redis |
| Hobby is for personal, non-commercial use | A personal portfolio with a booking link is generally fine | No change proposed; your judgement |

## 8. Estimated running costs

| Service | Usage | Cost |
|---|---|---|
| Vercel Hobby | unchanged | $0 |
| GitHub Actions (public repo) | ~96 short runs/day | $0 |
| Upstash Redis (existing free tier) | a few thousand commands/day | $0 |
| Google Calendar + Gmail APIs | low volume, well under quotas | $0 |
| Telegram Bot API | n/a | $0 |
| PostHog (existing free tier) | ~100 small queries/day | $0 |
| OpenAI | owner agent + slightly longer public prompts | **~$1–5/month** extra |

**No new paid plans or services.**

## 9. Security checklist

- **Mode separation:** public and owner tools are separated in code, and the owner checks run before any model call.
- **Telegram:** secret header, owner user id and chat id are verified; `update_id` is deduplicated; button nonces are one-time; irreversible actions need Confirm.
- **Endpoint secrets:**
  - `/api/jobs/tick` needs `JOB_SECRET`, and the cron endpoint needs `CRON_SECRET`.
  - Signed links expire and work once.
- **OAuth tokens:** encrypted at rest; minimum Calendar scopes.
- **Gmail:** reads only Miki thread ids; no inbox search or listing.
- **Visitor protection:** email verification before any request reaches you; per-IP and per-email rate limits on codes and submissions.
- **Prompt injection:**
  - visitor and email text is treated as data;
  - tool arguments are validated with zod;
  - visitor text is escaped in Telegram;
  - email HTML is reduced to plain text before Miki or Telegram sees it.
- **Calendar privacy:** the public path touches FreeBusy only.
- **Idempotency:** event creation is keyed by request id; slot locks prevent double booking.
- **Privacy note:** a short note in the booking dialog and Miki's footnote covers what's collected, why, and the 90-day retention.

## 10. Phases (each on its own branch, preview-tested before `main`)

1. **Rebrand and storage:** Miki copy and prompt, the Redis store and audit log, a Telegram notifier replacing Pushover. *Needs: Telegram bot created.*
2. **Scheduling:** Google OAuth via Telegram link, FreeBusy, the booking service, the Book a call dialog, email verification codes via Gmail. *Needs: Google Cloud project and OAuth client.*
3. **Telegram:** webhook, approval cards, owner agent, commands, confirm-before-execute.
4. **Gmail:** owner-approved replies, thread mapping, reply polling relayed to Telegram, failure handling.
5. **Visitor milestones:** PostHog query, ticks (GitHub Actions, traffic, cron), preferences, owner opt-out. *Needs: PostHog personal API key.*
6. **Tests:**
   - unit tests for availability, idempotency and auth guards;
   - webhook replay tests;
   - browser regression comparing the existing site with today's screenshots;
   - production build;
   - preview review before `main`.

## 11. External setup (you)

### A. Telegram bot (5 min)
1. In Telegram, open **@BotFather** → `/newbot` → name it **Miki** → choose a username, e.g. `christian_miki_bot`. Copy the **token**.
2. Open your new bot and press **Start**, so it's allowed to message you.
3. Get your numeric user id from **@userinfobot** (send it any message). For a private chat with the bot, your chat id is the same number.
4. Send me the user id; put the token into Vercel and `.env.local` as `TELEGRAM_BOT_TOKEN`. I'll register the webhook once deployed.

### B. Google Cloud (15 min)
1. Go to **console.cloud.google.com**, then **New project** → "Miki". No billing account needed.
2. **APIs & Services → Library:** enable **Google Calendar API** and **Gmail API**.
3. **OAuth consent screen** (Google Auth Platform):
   - User type: **External**. App name: Miki. Support email: yours.
   - Scopes: add the four from section 4.
   - Test users: add `onovochristian19@gmail.com`.
   - Then **Publish app** → In production. Ignore the verification prompt; it's for personal use.
4. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorised redirect URIs:
     - `https://www.christianonovo.com/api/google/oauth/callback`
     - `http://localhost:3000/api/google/oauth/callback`
   - Copy the **Client ID** and **Client secret** into Vercel and `.env.local`.

### C. PostHog (2 min)
1. In PostHog, click your avatar → **Personal API keys** → **Create**, then choose scope **Query: Read** for your project only. Copy the `phx_…` key.
2. Find the **Project ID** in **Settings → Project → General**.

### D. Secrets I'll generate for you
`TELEGRAM_WEBHOOK_SECRET`, `TOKEN_ENCRYPTION_KEY`, `ACTION_SIGNING_SECRET`, `JOB_SECRET` and `CRON_SECRET`: random values written into `.env.local`, for you to copy into Vercel. `JOB_SECRET` also goes into **GitHub → Settings → Secrets and variables → Actions**.

## 12. Remaining risks

- **Google verification:** Google may require verification for `gmail.readonly` even for personal use. The fallback is described in section 4.
- **Slow reply detection:** on days when GitHub's scheduler is slow and the site is quiet, email replies can take up to a few hours to reach Telegram.
- **Miki's voice:** it changes from first person ("I") to third person ("Christian"), so existing answers will read differently. This is required by the spec.
