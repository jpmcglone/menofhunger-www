# Deployment

## Render

The www service runs Nitro SSR in Node mode. See [render.yaml](render.yaml) for the Blueprint.

- **Plan:** Standard (2GB RAM / 1 CPU) — recommended for SSR at ~1k DAU.
- **Build:** `npm ci && npm run build`
- **Start:** `node .output/server/index.mjs`

## CDN

To reduce bandwidth and request load on the www service, put a CDN (e.g. Cloudflare) in front of it:

1. **Add Cloudflare** (or similar) as a reverse proxy in front of the www Render service.
2. **Point your domain** to the CDN; set the CDN origin to your Render www URL (e.g. `https://menofhunger-www.onrender.com`).
3. The CDN will respect `Cache-Control` headers; no code changes are needed.

### Cache headers

The app already sets appropriate headers via [nuxt.config.ts](nuxt.config.ts) routeRules:

| Path       | Cache-Control                                           |
| ---------- | ------------------------------------------------------- |
| `/_nuxt/**`| `public, max-age=31536000, immutable`                   |
| `/images/**` | `public, max-age=86400, stale-while-revalidate=86400` |
| `/sounds/**` | `public, max-age=86400, stale-while-revalidate=86400` |

`/_nuxt/*` assets (JS, CSS) are long-lived and immutable. Static assets under `/images` and `/sounds` use 24h cache with stale-while-revalidate.
