---
name: runtime-hydration-check
description: >-
  Run and interpret the Playwright-based runtime hydration check
  (`scripts/check-hydration.mjs`) for the menofhunger-www Nuxt app. Use when
  finishing a substantive UI/SSR change, when the user asks to verify hydration,
  when `npm run check:hydration` fails, or when adding a new public/SSR page that
  needs to be added to the route list.
---

# Runtime hydration verification

Use the [SSR skill](../ssr-hydration/SKILL.md) for rendering invariants and the
[validation matrix](../../../docs/engineering-policy.md#validation-matrix) for when to run checks.
`npm run check:hydration` visits `scripts/hydration-routes.json` and fails on hydration warnings
or uncaught errors. Set `HYDRATION_BASE_URL` to reuse an existing server; otherwise the harness
owns a bounded production preview server. Add affected public routes and report authentication
coverage honestly. Keep the server/browser cleanup working on both setup failure and interruption.
