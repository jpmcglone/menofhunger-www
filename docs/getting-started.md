# Getting started with the website

This is the Nuxt 4 / Vue 3 client. The sibling API owns authentication and product data. Read this guide for your first local session and [README](../README.md) for the command reference.

## One-command setup

From the repository root:

```sh
./init.sh
```

This checks Node, creates `.env` only if missing, installs dependencies, prepares Nuxt, and starts the website. Run the sibling API’s `./init.sh` in another terminal first. Existing `.env` values are preserved.

Use `./init.sh --setup-only` to prepare dependencies without launching the app, or `./init.sh --help` for usage. Reruns reinstall locked Node dependencies where applicable but do not reset data, overwrite configuration, or kill existing servers. The manual steps below are useful for troubleshooting.

## First local run

1. Clone `menofhunger-api` beside this repository and follow its [getting-started guide](../../menofhunger-api/docs/getting-started.md). Have the development API listening on `http://localhost:3001` with `DISABLE_TWILIO_IN_DEV=true`.
2. From `menofhunger-www`, use the Node version in [`.nvmrc`](../.nvmrc) (the package minimum is 22.13.0), then initialize without overwriting local configuration:

   ```sh
   test -f .env || cp env.example .env
   npm ci
   ```

   Verify these values in `.env`:

   ```dotenv
   NUXT_PUBLIC_API_BASE_URL=http://localhost:3001/v1
   NUXT_API_BASE_URL=http://localhost:3001/v1
   ```

   The second value is optional and otherwise falls back to the public base. Both must include `/v1`. Leave optional provider settings blank for basic login/feed work.
3. Check for an existing server with `npm run dev:check`, then start your own terminal session if needed:

   ```sh
   npm run dev
   ```

4. Open [localhost:3000](http://localhost:3000), sign in using a synthetic local phone such as `+12025550123` and `000000`, and complete onboarding. The bypass belongs to the development API; it is not a website feature.
5. Refresh the page and confirm you remain signed in. In browser Network tools, inspect `/v1/auth/me` for `data.user`. Sign out and confirm authenticated state clears. Keep cookies and phone details out of screenshots or shared logs.

The initialization script uses this npm lifecycle (`postinstall` runs `nuxt prepare`) and preserves existing `.env` configuration.

## Eight things to understand

### 1. Know where a feature belongs

[pages](../pages) defines routes; [layouts](../layouts) defines the surrounding shell; [components](../components) contains reusable UI; [composables](../composables) holds shared behavior. [nuxt.config.ts](../nuxt.config.ts) controls runtime config, integrations, and route rendering. Long-form editorial content belongs in the content system; product data comes from the API.

### 2. Use the shared API client

[useApiClient](../composables/useApiClient.ts) owns backend requests, base URL selection, cookie forwarding during SSR, browser credentials, and common failure handling. Feature code should use it instead of adding direct backend `fetch`/`$fetch` calls. Pass product paths such as `/posts`; the configured base supplies `/v1`.

Responses use the [ApiEnvelope types](../types/api.ts). Keep network failure, an anonymous `/auth/me` result, and an empty successful list distinct in the UI. Root infrastructure routes such as `/health` require the API host without `/v1`.

### 3. The browser holds the session; Vue holds the displayed auth state

Read [useAuth](../composables/useAuth.ts), [authState](../composables/auth/authState.ts), and [auth middleware](../middleware/auth.global.ts).

```text
Login UI -> useAuth/useApiClient -> POST /v1/auth/phone/start
Code UI  -> POST /v1/auth/phone/verify -> API sets moh_session cookie
Browser  -> cookie sent on subsequent credentialed requests
GET /v1/auth/me -> auth state -> page/middleware decisions
```

The API verifies SMS through Twilio and creates/reuses the account. The cookie contains a random opaque token; the API stores its HMAC hash. The JSON `sessionId` is not a bearer token. The cookie is `HttpOnly`, so application JavaScript should not read it or copy it to localStorage. There is no client JWT decode or refresh-token exchange to add.

Normal API sessions last 30 days and renew within the last 7 days using `Set-Cookie`. Logout revokes the server session and clears client state. Shared auth generation counters prevent older in-flight requests from restoring stale identity; use the existing auth actions when signing out or switching accounts.

### 4. Keep SSR and hydration consistent

This app mixes SSR and client-rendered routes; inspect `routeRules` in [nuxt.config.ts](../nuxt.config.ts) before changing a route. Browser-only APIs belong behind a client boundary. Initial server and browser markup must agree; do not infer an authenticated user merely because a cookie is present.

Use request-scoped Nuxt state patterns for user data and retain the shared API client's SSR cookie forwarding. Read [auth hydration guardrails](../tests/auth-hydration-guardrails.test.ts) before changing login bootstrap or route redirects. Middleware improves navigation, while API guards enforce permissions.

### 5. Environment values and origins must line up

`NUXT_PUBLIC_*` values are public browser configuration. Never put session HMAC secrets, Twilio credentials, private push keys, or billing secrets there. Server credentials belong to the API environment. [env.example](../env.example) is the shareable template; `.env` is local configuration.

For local work, consistently use `localhost`, and allow `http://localhost:3000` in the API's `ALLOWED_ORIGINS`. The API uses credentialed CORS and `Origin`/`Referer` CSRF checks for unsafe requests. Production cookies require HTTPS and use the configured domain. A 403 caused by origin configuration should be repaired at that configuration boundary.

### 6. Realtime updates must reach existing state

[usePresence](../composables/usePresence.ts) and [the presence composables](../composables/presence) manage Socket.IO behavior. The socket uses the same session cookie and connects to `/socket.io` on the API host. Subscription lifetimes, reconnects, and identity changes matter: use the existing subscription/state machinery, and clean up when a view leaves.

When changing posts, messages, or counts, test with two tabs: mutate in one and confirm the other updates without losing pagination, selection, or scroll position.

### 7. Keep contracts and visual patterns shared

[types/api.ts](../types/api.ts) is the hand-maintained API mirror. [api-contracts.gen.ts](../types/api-contracts.gen.ts) is generated by `npm run emit:contracts` in the sibling API. [api-contract-check.ts](../types/api-contract-check.ts) checks assignability during TypeScript checking; `validate-api-types` verifies the pipeline is wired up. Update the API DTO, generated contract, client mirror, and affected iOS models together for response changes.

For UI work, start with neighboring components and [assets/css/main.css](../assets/css/main.css), then preserve existing layout and interaction conventions. Include loading, empty, error, and narrow-screen behavior in the feature.

### 8. Use the existing quality gate

Run focused Vitest tests while iterating. Before finishing substantive work:

```sh
npm run lint
npx nuxi typecheck
npm run validate-api-types
npm test
```

For a production build, `npm run build` runs a prebuild gate (typecheck, contract validation, tests) and bumps the service-worker version. Review that generated change. For rendering work, also run the relevant browser checks described by [check-hydration.mjs](../scripts/check-hydration.mjs) and inspect the affected routes in the browser. See [deployment](../DEPLOYMENT.md) for publishing and [observability](observability.md) for diagnostics.

## If setup fails

| Symptom | First check |
| --- | --- |
| API calls return 404 | Both API bases include `/v1`; product paths do not duplicate it. |
| Browser works but SSR fails | Server-side `NUXT_API_BASE_URL` is reachable from the Nuxt process. |
| Login immediately disappears | API cookie domain, allowed origin, and consistent use of `localhost`. |
| Code `000000` is rejected | The configured API is local/non-production. |
| Port 3000 is busy | `npm run dev:check`; reuse the server or stop your own process. |
| UI looks stale after changes | Hard refresh and inspect service-worker state; `dev:clean` also kills the dev server and bumps its version. |
| Contract check fails | Regenerate from the API and reconcile `types/api.ts`; do not hand-edit generated contracts. |

