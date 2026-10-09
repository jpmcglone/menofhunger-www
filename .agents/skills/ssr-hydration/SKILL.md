---
name: ssr-hydration
description: Implement SSR-safe MOH web rendering and verify hydration with the existing Playwright harness.
---

# SSR and hydration

Server HTML and the first client render must agree, including attributes and valid HTML
nesting. A deterministic value changed in `onMounted` is safe; browser storage, viewport,
random values and local time must not choose the initial rendered markup. Use `useId`
for instance IDs and request-isolated, payload-backed state for server data.

Use CSS breakpoints for presentation and `useHydratedMediaQuery` for behavior with a stable
initial value. `v-show` still renders children on the server; it cannot hide browser-only
code or mismatched attributes. Use `ClientOnly` or a client component for dependencies
that cannot render on the server, with a stable-size fallback when needed. Prefer `v-if`
for conditional mounting; preserve DOM/state with `v-show` when that is the desired behavior.

`nuxt.config.ts` routeRules owns rendering; `definePageMeta({ ssr: false })` does not.
Keep useful public/shareable HTML and previews. Auth-aware SSR requires request isolation,
visibility checks and private/no-store caching; auth alone is not a reason to disable SSR.
Fix the mismatch rather than hiding it by changing the route's rendering mode.

Diagnose a hard navigation using the warning/component trace. Check invalid nesting,
unstable IDs/state, stale data and third-party DOM mutations. `TransitionGroup` supports
SSR with stable keys and valid wrappers; do not duplicate lists without a reproduced bug.

`npm run check:hydration` visits `scripts/hydration-routes.json` and fails on hydration
warnings or uncaught errors. `HYDRATION_BASE_URL` reuses a running server; otherwise the
harness owns a bounded production preview. Preserve cleanup on setup failure/interruption.
Add affected public routes and report anonymous/authenticated coverage separately.
Use the [validation matrix](../../../docs/engineering-policy.md#validation-matrix) to choose checks.
