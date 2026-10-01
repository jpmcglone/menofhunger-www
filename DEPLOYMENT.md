# Deployment

## Render

The www service runs Nitro SSR in Node mode. See [render.yaml](render.yaml) for the Blueprint.

### CI-gated deployments

Pushes to `main` run GitHub Actions first. Both MOH services use **After CI Checks
Pass** (`autoDeployTrigger: checksPass`): failed checks block automatic deployment;
passing checks allow Render to install, build, and deploy. Keep the existing lint,
type, contract, and test jobs enabled on `main`. No detected checks also blocks an
automatic deployment.

Build filters have no included-path restrictions and ignore only:

```text
.agents/**
.cursor/**
.vscode/**
AGENTS.md
README.md
DEPLOYMENT.md
docs/engineering-policy.md
```

A change containing only these paths skips automatic deployment. A mixed change
with application files still deploys after CI. Do not ignore all Markdown or all
of `docs/`: web Markdown supplies published content, and API documentation is used
by build checks. Dependencies, build scripts, content, and migrations remain eligible.

Batch related changes before pushing when practical. Use `[skip render]` only for
an individual commit that does not need deployment. Manual deployments bypass the
automatic CI gate and build filters; configuration updates can also trigger a deploy.
See [Render deploys](https://render.com/docs/deploys) and
[build filters](https://render.com/docs/monorepo-support#setting-build-filters).

Apply settings to the existing services; do not create a new Blueprint or change
runtimes. Enable CI gating before removing duplicate web checks. Billing limits,
service sizes, and disabled previews are unchanged.

#### Rollback baseline (October 1, 2026)

Before this change, both services tracked `main`, deployed **On Commit**, and had
no included or ignored build paths. Restore those settings to reverse the gate
and filters. The previous www build command was:

```sh
npm ci && npx nuxi typecheck && node scripts/validate-api-types.mjs && npm run build
```

The API build remains `npm ci --include=dev && npm run build:ci`, with
`npm run prisma:migrate:deploy` before deployment. Both existing services start
with `npm run start`. Rollback does not require runtime or billing changes.

### Zero-downtime deploys

Render already boots the new instance next to the live one. We gate the traffic flip on `GET /health` (`healthCheckPath` in `render.yaml`) so it does not switch until Nitro can actually serve. `maxShutdownDelaySeconds: 120` lets in-flight SSR finish after `SIGTERM`.

- **Do not attach a persistent disk** to www (or the API). A disk disables zero-downtime and forces a hard cutover.
- Stagger deploys when both repos change: API first, then www (humans decide when each push goes out; agents do not poll Render for live unless explicitly asked).
- Live sockets still reconnect when the old process exits; that is not HTTP downtime.

If the service is not picking up Blueprint fields, set them once in the Render Dashboard (Settings): Health Check Path = `/health`, Max Shutdown Delay = `120`.

### Build memory

Nuxt typechecking runs `vue-tsc` in a child process. The project [.npmrc](.npmrc)
sets `node-options=--max-old-space-size=6144` so `npm run typecheck` and other
npm-spawned Node processes inherit the same heap ceiling as the build script.
An option on the `build` script alone does not reach a separate typecheck.
This addresses the V8 heap-limit failure around 2 GB without skipping checks.

Use `npm ci --no-audit --no-fund && npm run build` in Render. The prebuild hook
stamps the service-worker version. Typecheck, contract validation, and tests run
in GitHub Actions and in the local `npm run check`; repeating them in the Render
build spends pipeline minutes. Existing dashboard commands that invoke
`npx nuxi typecheck` separately also inherit the project setting.

The heap budget is for build tooling. Render starts the server directly with
`node .output/server/index.mjs`, which does not read `.npmrc`. Do not set a
service-wide 6 GB `NODE_OPTIONS` on the 2 GB runtime instance. Build compute is
separate from the runtime plan; see [Render's build pipeline](https://render.com/docs/build-pipeline).

### Pipeline minutes

Included pipeline minutes depend on the workspace plan; consult Render billing for
current usage. CI gating, conservative build filters, and avoiding duplicate web
checks reduce unnecessary minutes. Keep `npm ci` for reproducible installs and
retain the service-worker prebuild hook. The live API uses native Node; the Docker
configuration is an alternative, not the current production build pipeline.

- **Plan:** Standard (2GB RAM / 1 CPU) — recommended for SSR at ~1k DAU.
- **Build:** `npm ci --no-audit --no-fund && npm run build`
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
