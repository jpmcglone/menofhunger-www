# Deployment

## Render

The www service runs Nitro SSR in Node mode. See [render.yaml](render.yaml) for the Blueprint.

### Zero-downtime deploys

Render already boots the new instance next to the live one. We gate the traffic flip on `GET /health` (`healthCheckPath` in `render.yaml`) so it does not switch until Nitro can actually serve. `maxShutdownDelaySeconds: 120` lets in-flight SSR finish after `SIGTERM`.

- **Do not attach a persistent disk** to www (or the API). A disk disables zero-downtime and forces a hard cutover.
- Stagger deploys when both repos change: API first, wait until it is live, then www.
- Live sockets still reconnect when the old process exits; that is not HTTP downtime.

If the service is not picking up Blueprint fields, set them once in the Render Dashboard (Settings): Health Check Path = `/health`, Max Shutdown Delay = `120`.

### Pipeline minutes

Render’s free tier includes 500 pipeline minutes/month. To reduce usage:

- **Fewer deploys:** Deploy only from `main` when needed; avoid branch/preview deploys if not required.
- **Faster www builds:** Your build is already tuned (no production source maps in [nuxt.config.ts](nuxt.config.ts)). To use Render’s cache and speed up installs, you can set `buildCommand: npm install --prefer-offline --no-audit && npm run build` in [render.yaml](render.yaml). Tradeoff: `npm install` is less strict than `npm ci` (lockfile still pins versions).
- **API:** The API Dockerfile uses SWC for fast compilation and a lean runner stage; dependency and build layers are cached between builds when `package*.json` and source don’t change.
- **Spend control:** In Render dashboard you can set a custom pipeline minute limit so builds pause instead of incurring overage.

- **Plan:** Standard (2GB RAM / 1 CPU) — recommended for SSR at ~1k DAU.
- **Build:** `npm ci && npm run build`
- **Start:** `node .output/server/index.mjs`

## CDN

Render already sits behind Cloudflare’s proxy, but that layer does **not** cache (`cf-cache-status: DYNAMIC` even on `immutable` `/_nuxt` assets). To actually cut origin bandwidth, put **your own Cloudflare zone** in front later (nameservers + orange-cloud). This pass only sets CDN-ready `Cache-Control` / `s-maxage` headers.

When you do enable a real zone:

1. **Add Cloudflare** as a reverse proxy in front of the www Render service.
2. **Point the domain** at Cloudflare; set the origin to the Render www URL (e.g. `https://menofhunger-www.onrender.com`).
3. **Cache Rules** (do not “Cache Everything” on HTML):
   - Cache `/_nuxt/*` and `/_fonts/*` (already `immutable` + 1y `s-maxage`).
   - Cache `/images/*`, `/sounds/*`, `/_ipx/*` (24h `s-maxage`).
   - **Bypass HTML** — SSR documents are `no-store` on purpose (iOS Safari stale JS chunks after a deploy).
   - Do **not** long-cache `/sw-push.js`.
4. Optional API zone: cache anonymous `GET /v1/meta/landing`, `/v1/public/*`, `/v1/scripture`, and cookie-less `GET /v1/explore`. Skip cookie-authed JSON (`private, no-store`).

### Cache headers

The app sets these via [nuxt.config.ts](nuxt.config.ts) routeRules (`s-maxage` is for a future CDN; browsers use `max-age`):

| Path | Cache-Control |
| --- | --- |
| HTML (`/`, `/u/**`, `/p/**`, …) | `no-store` |
| `/_nuxt/**` | `public, max-age=31536000, s-maxage=31536000, immutable` |
| `/_fonts/**` | `public, max-age=31536000, s-maxage=31536000, immutable` |
| `/images/**` | `public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400` |
| `/sounds/**` | `public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400` |
| `/_ipx/**` | `public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400` |

Landing heroes are pre-encoded WebP under `/images/` (plain `<img>`). They do **not** go through IPX. `/_ipx/**` remains for any leftover Nuxt Image transforms.

`/_nuxt/*` assets (JS, CSS) are long-lived and immutable. `/images` and `/sounds` use 24h cache because those paths are not content-hashed.

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
