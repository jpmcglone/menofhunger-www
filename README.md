# menofhunger-www

Public-facing Nuxt 4 website for Men of Hunger. Talks to [`menofhunger-api`](../menofhunger-api) over a cookie-authenticated JSON API.

## Architecture at a glance

- **Framework**: Nuxt 4 (`nuxt ^4.x`), Vue 3.5, TypeScript
- **Styling**: Tailwind (v4-style entry) + Nuxt UI + PrimeVue theme
- **API**: all product API calls go through `composables/useApiClient.ts`. Do **not** add ad-hoc `fetch`/`$fetch` to the backend.
- **Content**: `@nuxt/content` for long-form pages (docs, legal). Not for product features.
- **Observability**: Sentry (client + server), PostHog. PII scrubbing lives in `sentry.client.config.ts`.
- **Auth**: HTTP-only cookies set by the API. Admin surfaces are hidden from non-admins via 404 (see `middleware/admin.ts`), never 401/403.

See also:
- `DEPLOYMENT.md` — Render deployment, env vars, troubleshooting
- `.cursor/rules/` — project conventions (API contract, in-place route state, layouts, etc.)
- `docs/` — feature-specific notes

## Setup

Node `>=22.13.0` required (see `.nvmrc`, `engines.node`).

```bash
npm ci
cp env.example .env   # then fill in real values
```

Required env vars (minimum for local dev):

- `NUXT_PUBLIC_API_BASE_URL` — browser-facing API base URL. This must include the `/v1` path segment because all product routes live under the version prefix (e.g. `http://localhost:3001/v1` or `https://api.menofhunger.com/v1`).
- `NUXT_API_BASE_URL` — SSR-side API base URL (useful when containerized; defaults to `NUXT_PUBLIC_API_BASE_URL`). Use the same versioned value.

Optional but commonly set:

- `NUXT_PUBLIC_ASSETS_BASE_URL` — public R2/CDN bucket for uploaded media
- `NUXT_PUBLIC_VAPID_PUBLIC_KEY` — must match the API's `VAPID_PUBLIC_KEY` (for Web Push)
- `NUXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT` — Sentry
- `NUXT_PUBLIC_POSTHOG_KEY`, `NUXT_PUBLIC_POSTHOG_HOST` — PostHog
- `NUXT_PUBLIC_FACEBOOK_APP_ID` — OG tags
- `NUXT_PUBLIC_IOS_APP_STORE_ID` — Smart App Banner for iOS Safari
- `NUXT_PUBLIC_ADSENSE_*` — see `nuxt.config.ts` for the full set

Full env check: `node scripts/check-env.mjs` (load `.env` first or export vars in the shell).

## Development

```bash
npm run dev          # Nuxt dev server on http://localhost:3000
npm run dev:clean    # kill stale dev server + bump SW version + restart
npm run dev:kill     # free port 3000
npm run lint         # flat ESLint config
npm run test         # Vitest (runs in Nuxt + happy-dom environment)
```

The dev server auto-reloads. Do not start long-running dev servers from tooling/scripts — assume one is already running.

## When you change an API response

Per `.cursor/rules/00-project-overview.mdc`:

1. Update DTOs in `menofhunger-api/src/common/dto/**`
2. Update types in `menofhunger-www/types/api.ts`
3. Run `npx nuxi typecheck` and `node scripts/validate-api-types.mjs`

## Build / deploy

```bash
npm run build        # runs prebuild gate: typecheck + validate-api-types + tests
npm run preview      # serve .output locally
```

`prebuild` is a quality gate: it bumps the service-worker version, runs `nuxi typecheck`, validates API type drift against the API repo, and runs the test suite. If any of these fail, the build fails.

Deploy: see `DEPLOYMENT.md`. In short: Render, `npm ci && npm run build`, with env vars set per `render.yaml`.

## Testing

- `vitest.config.ts` uses `@nuxt/test-utils/config` with `environment: 'nuxt'` and happy-dom.
- Tests live in `tests/`. Mix of structural guardrails (e.g. `api-client-guardrails.test.ts`, `hydration-guardrails.test.ts`) and behavioral tests.

## Troubleshooting

### Port 3000 in use

```bash
npm run dev:check
npm run dev:kill
```

### Stale client after deploy (iOS PWA especially)

Handled automatically by `plugins/chunk-error-recovery.client.ts` + HTML `cache-control: no-store` in `nuxt.config.ts` `routeRules`. If a user still sees a broken page, a hard refresh clears it.

## License

Private / proprietary. Not open source.
