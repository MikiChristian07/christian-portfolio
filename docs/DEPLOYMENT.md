# Launching the new site

The new site lives on the `redesign/uli-cipher` branch. The live site (`main`) is still the old Vite build until these steps are done. Nothing here is automatic: each step is yours to run.

## Before you start

- [ ] Content reviewed: [docs/CONTENT-REVIEW.md](CONTENT-REVIEW.md) (headline, About copy, inferred project details, glyphs, portrait).
- [ ] Rotated the OpenAI key and Upstash token that were shared in chat (optional but recommended), and set a monthly budget limit on the OpenAI key.
- [ ] Decided on analytics: create a PostHog project (EU region) and turn on **Cookieless server hash mode** and **Discard client IP data** in its project settings, or leave the key empty to ship without analytics.

## 1. Environment variables in Vercel

Vercel → your project → **Settings → Environment Variables**. Tick **Production** and **Preview** for each. Names and purposes are in [.env.example](../.env.example).

| Name | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | yes | Twin answers |
| `UPSTASH_REDIS_REST_URL` | yes | Rate limits. Without it the twin pauses in production (by design) |
| `UPSTASH_REDIS_REST_TOKEN` | yes | |
| `PUSHOVER_USER` | recommended | Phone alerts for contact requests and unknown questions |
| `PUSHOVER_TOKEN` | recommended | |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | yes | `service_1c5ugmc` |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | yes | `template_ho5x8ll` |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | yes | |
| `NEXT_PUBLIC_POSTHOG_KEY` | optional | Empty = no analytics loaded at all |
| `OPENAI_MODEL`, `TWIN_DAILY_LIMIT` | optional | Defaults `gpt-5.4-mini`, `400` |

Keep the old `VITE_APP_EMAILJS_*` variables until launch is confirmed, then delete them.

## 2. Preview first

1. Push the branch: `git push -u origin redesign/uli-cipher`. Vercel builds a **Preview** deployment for it automatically.
2. If the preview build fails with a Vite error, change the project's framework (step 3) and redeploy the preview.
3. Open the preview URL and check:
   - [ ] Homepage, all three case studies, `/ask`, a 404 (any made-up path).
   - [ ] Ask the twin a question in the hero, the corner panel and `/ask`.
   - [ ] Ctrl+K (or ⌘K) opens the palette.
   - [ ] Send the contact form once; the email arrives.
   - [ ] On your phone: menu, twin sheet, contact form.

Note: the twin checks the request's origin, so it works on the preview domain and on www.christianonovo.com without changes.

## 3. Switch the framework

Vercel → **Settings → Build and Deployment**:
- **Framework Preset**: Next.js
- **Build Command**, **Output Directory**, **Install Command**: leave on default (clear any overrides; the old `npm install --legacy-peer-deps` override is no longer needed and `vercel.json` was removed).
- **Node.js Version**: 20.x or newer.

## 4. Go live

Merge `redesign/uli-cipher` into `main` (pull request or `git merge`), then push `main`. Vercel deploys production from `main`.

After it's live:
- [ ] Repeat the checks from step 2 on https://www.christianonovo.com.
- [ ] Share a link (e.g. `/work/kordy`) in a chat app and confirm the preview card shows.
- [ ] Submit the sitemap in Google Search Console: `https://www.christianonovo.com/sitemap.xml`.
- [ ] Delete the `VITE_APP_EMAILJS_*` variables.

## Rolling back

Vercel → **Deployments** → pick the last old-site production deployment → **Promote to Production** (instant). Fix forward on the branch, then redeploy.

## After launch

- The Render twin (`digital-twin-mtyb.onrender.com`) is no longer used by the site. Shut it down when you're happy, or leave it.
- To change what the twin knows, edit the files in `content/` (they feed the site and the twin together) or the summary and LinkedIn text in `lib/twin/knowledge.ts`.
- To adjust cost: `TWIN_DAILY_LIMIT` caps answers per day across all visitors.
