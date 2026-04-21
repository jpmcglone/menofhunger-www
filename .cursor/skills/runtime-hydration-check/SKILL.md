---
name: runtime-hydration-check
description: >-
  Run and interpret the Playwright-based runtime hydration check
  (`scripts/check-hydration.mjs`) for the menofhunger-www Nuxt app. Use when
  finishing a substantive UI/SSR change, when the user asks to verify hydration,
  when `npm run check:hydration` fails, or when adding a new public/SSR page that
  needs to be added to the route list.
---

# Runtime Hydration Check

Complement to the `ssr-hydration` skill. That skill teaches you how to **write** SSR-safe code; this skill is about how to **prove** it at runtime via `npm run check:hydration`.

## What it does

`scripts/check-hydration.mjs`:

1. Spawns `node .output/server/index.mjs` on port 4173 (configurable via `HYDRATION_PORT`).
2. Launches headless Chromium via Playwright.
3. Visits every route in `scripts/hydration-routes.json` with `waitUntil: 'networkidle'`.
4. Captures `console` events and `pageerror` events on each page.
5. Fails if any page emits a `[Vue warn] Hydration ...` message, a `Hydration X mismatch` message, or an uncaught error.

It does **not** require an external dev server. It builds and runs its own preview, isolated from anything you have on `localhost:3000`.

## Prerequisites

```bash
npm i -D playwright
npx playwright install chromium
```

The first command installs the npm package; the second downloads the browser binaries. Both are one-time. If `playwright` is missing the script tells the user how to install it and exits.

## When to run it

- After **any** substantive change to `pages/**`, `components/**`, `layouts/**`, `composables/**`, `app.vue`, or `nuxt.config.ts` that affects public/SSR-rendered routes.
- Whenever the feature-done checklist (`.cursor/rules/40-feature-done-checklist.mdc`) says to.
- Always after `npm run build` (the script needs `.output/`).

## How to run it

```bash
cd menofhunger-www
npm run build            # produces .output/
npm run check:hydration  # spins up preview, visits routes, asserts clean hydration
```

Optional overrides:

```bash
# Test against an already-running server (e.g. dev server on :3000)
HYDRATION_BASE_URL=http://localhost:3000 npm run check:hydration

# Use a different port for the spawned preview
HYDRATION_PORT=4321 npm run check:hydration

# Loosen per-route timeout (default 30s)
HYDRATION_TIMEOUT_MS=60000 npm run check:hydration
```

## Interpreting failures

The script prints one line per route:

```
  [PASS] /
  [FAIL] /about
    hydration warning: [Vue warn] Hydration node mismatch: ... at <AboutPage>
```

Workflow when a route fails:

1. **Identify the component.** The Vue warning ends with `at <Component> at <Parent> ...`. The leftmost component is where the mismatch lives.
2. **Apply the `ssr-hydration` skill.** Read it, then walk the "Investigating Hydration Warnings" steps (Step 1 → Step 5) on the offending file.
3. **Re-run `npm run check:hydration`.** Iterate until clean.
4. **Add a guardrail.** Once fixed, add a structural test in `tests/hydration-guardrails.test.ts` that asserts the safe pattern stays in place — so the next refactor can't silently regress it. Use the existing tests in that file as templates.

## Adding a route

When you add or significantly change a public page (anything without `definePageMeta({ ssr: false })`), edit `scripts/hydration-routes.json`:

```json
{
  "routes": [
    "/",
    "/about",
    "/your-new-public-page"
  ]
}
```

You do **not** need to list:
- Auth-gated pages opted out of SSR via `definePageMeta({ ssr: false })`.
- Admin pages (404'd for non-admins; behind auth).
- Pages with required path params unless you list a concrete real-data URL the preview server can resolve.

For dynamic routes (`/u/[username]`, `/p/[id]`), pick a known-stable example like `/u/some-real-username`. If no such fixture is available, skip it — false positives from missing data are noise.

## What this check does NOT cover

- Hydration on **authenticated** views (the headless browser has no session). Use the structural guardrails in `tests/auth-hydration-guardrails.test.ts` for those.
- Race conditions that need real network latency. Add focused unit/integration tests if you suspect one.
- Visual regressions. Out of scope.

## Quick reference

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "Hydration node mismatch" | `v-if` gated on client-only state | Switch to `v-show` or `<ClientOnly>` |
| "Hydration children mismatch" | `v-for` keys differ across server/client, or `<TransitionGroup>` without server fallback | Stable keys; mount-gated `<TransitionGroup>` |
| "Hydration class/style mismatch" | Reactive class/style depends on `window`/auth/`isMobile` | Guard with hydrated ref returning `undefined` on server |
| `pageerror` only | Runtime exception (often missing import, undefined access in setup) | Read stack, fix; the build often hides this |
