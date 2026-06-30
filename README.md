# Personal Organizer

A personal, single-user task & idea organizer built as an installable **PWA** for Android, running entirely on the **Cloudflare free tier** ($0 to operate). One private place for tasks with deadlines and push reminders, quick idea capture on the go, and a focused **"Today"** view.

> Built as a hands-on exercise with an AI coding agent and as a portfolio piece. Scope is deliberately lean — daily real-world use matters more than feature count.

## Features (v1)

- **Tasks with deadlines + push reminders.** Get a Web Push notification at the deadline, or 15/30/60 min before — even when the app is closed (a cron-driven Worker sends it).
- **Quick idea capture.** Jot ideas with optional priority, grouped by lightweight projects.
- **"Today" view.** Today's scheduled tasks + overdue items + daily routines, with a progress ring and a "day complete" celebration.
- **Daily routines.** Repeating checklist items that reset each day (a "today-only" world, no history).
- **Calendar.** Agenda list of upcoming scheduled tasks with a compact week strip.
- **Export / restore.** One-file JSON backup and a "restore from backup" import.
- **Offline-resilient shell.** Query cache persisted to `localStorage` so data shows instantly on reopen; requests time out fast instead of hanging on a sleeping radio.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Router — shipped as a PWA |
| Backend | Cloudflare Workers ([Hono](https://hono.dev)) |
| Database | Cloudflare D1 (SQLite) |
| Scheduler | Cloudflare Cron Triggers (every minute) → sends push |
| Notifications | Web Push (VAPID) via `@block65/webcrypto-web-push` + a service worker |
| Hosting | A **single Worker** serves the built frontend (Workers Static Assets) **and** the `/api/*` endpoints — same origin, zero CORS |
| Auth | A single application token (Bearer), checked by Worker middleware — single owner, not Cloudflare Access |

There is **no AI in the product itself** in v1 (a deliberate choice to keep it free and dependency-light). The architecture leaves the door open to add it later.

## Repository layout

```
web/        React + Vite frontend (PWA)
worker/     Cloudflare Worker — API, cron scheduler, static-asset serving
  src/        Hono app, push scheduler, import parser
  migrations/ D1 schema (0001…0005), applied manually via the D1 Console
tasks/      Working notes: todo (open items) + archive + lessons
DEPLOY.md   Step-by-step Cloudflare deployment guide
```

## Local development

Requires Node 20+ and a Cloudflare account (for `wrangler`).

```bash
# Worker (API + cron) on :8787
cd worker && npm install && npm run dev

# Frontend (Vite dev server) on :5173, in a second terminal
cd web && npm install && npm run dev
```

The frontend talks to the API via relative `/api/*` (proxied to the Worker in dev). Provide secrets locally in `worker/.dev.vars` (see `worker/.dev.vars.example`) — never commit it.

### Tests

```bash
cd worker && npm test   # API, scheduler, import parser
cd web && npm test      # frontend logic
```

## Deployment

Production is built and deployed **in Cloudflare's cloud straight from GitHub** (Workers Builds): every push to `main` triggers a build and redeploy — no local `wrangler deploy`. The D1 schema and secrets (`APP_TOKEN` + three VAPID values) are configured once in the Cloudflare dashboard.

Full walkthrough: **[DEPLOY.md](DEPLOY.md)**.

## Cost

Runs on Cloudflare's free tier with no payment card on file. The every-minute cron is ~1,440 invocations/day, far below the Workers free limit. If anything threatens to incur cost, the project stops rather than upgrading.

## License

[MIT](LICENSE).
