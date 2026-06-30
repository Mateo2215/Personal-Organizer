# Personal Organizer — frontend (`web/`)

React 19 + Vite + TypeScript PWA. This is the frontend half of the app; the
Cloudflare Worker in [`../worker/`](../worker/) serves it and provides the API.

See the [project README](../README.md) for what the app is, the full stack, and
[`../DEPLOY.md`](../DEPLOY.md) for deployment.

## Scripts

```bash
npm run dev      # Vite dev server on :5173 (API proxied to the Worker)
npm run build    # type-check + production build to dist/
npm run lint     # ESLint
npm test         # Vitest
```
