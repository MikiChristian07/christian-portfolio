# christianonovo.com

Christian Onovo's personal site: portfolio, case studies and an AI digital twin that answers questions about his work.

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, deployed on Vercel. The twin runs in this app at `/api/twin` (OpenAI, rate-limited with Upstash).

## Run locally

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

The site works without any keys; the twin and contact form need theirs (see `.env.example`).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | Lint, typecheck and build |

## Where things live

| Path | Contents |
|---|---|
| `content/` | All facts on the site (person, roles, projects, research). The twin reads these too. |
| `app/` | Routes: `/`, `/work/[slug]`, `/ask`, `/api/twin`, sitemap, robots, share images |
| `components/` | UI. `twin/` holds the shared conversation, assistant panel and /ask view |
| `lib/twin/` | Twin prompt, knowledge, tools, validation, rate limits |
| `app/globals.css` | Design tokens (night and day palettes, type scale, motion curves) |
| `docs/` | Discovery, content review, deployment |

## Docs

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): launching and rolling back
- [docs/CONTENT-REVIEW.md](docs/CONTENT-REVIEW.md): claims awaiting Christian's confirmation
- [docs/DISCOVERY.md](docs/DISCOVERY.md): audit, architecture and the decision to move the twin to Vercel
- [PRODUCT.md](PRODUCT.md): product truth for design work
