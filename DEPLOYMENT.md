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

### Service Worker (push notifications)

The push-only service worker is served at `/sw-push.js` (from `public/sw-push.js`). **Do not cache this file long-term.** If a CDN or reverse proxy caches it aggressively (e.g. long `max-age`), users can stay on an old SW and miss updates. Use a short `max-age` or `no-store` for `/sw-push.js` so deployments take effect. Nuxt’s default for `public/` is usually fine; override only if your CDN long-caches by path.

## Link previews (Facebook / Messenger)

### SSR timing

SSR for `/p/[id]` does: fetch post from API, optional auth check, and (for link-only posts) fetch link metadata from API. On cache miss, the API may call Microlink/Jina (up to ~2s). If total response time exceeds ~5–10 seconds, Facebook’s crawler can time out and cache an incomplete page.

**Mitigations:** CDN in front of www, SSR response caching (e.g. Nitro routeRules `cache` for `/p/**`), and API-side link metadata caching (LinkMetadata table + cron backfill). Those reduce latency for repeat requests.

### Messenger-specific behavior

Facebook Messenger can show minimal previews (URL + domain only) even when the Sharing Debugger validates og: tags. Reported as a platform quirk; workarounds:

1. Use [Sharing Debugger](https://developers.facebook.com/tools/debug/) and **Scrape Again** for the URL.
2. Ensure `fb:app_id` is set (fixes the “Missing Properties” warning).
3. Ensure `og:image` is absolute, ideally 1200×630 for the fallback logo.
