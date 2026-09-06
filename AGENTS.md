# Men of Hunger — Web

## Working agreement

Read [engineering policy](docs/engineering-policy.md) for scope, dependency versions,
product decisions, realtime contracts, process ownership, and the canonical validation matrix.
Preserve unrelated working-tree changes and inspect the nearest implementation before editing.

## Guidance layout

This is the shared entry point for Codex and Cursor. Repository skills live in `.agents/skills/<name>/SKILL.md`; read a skill when its description matches the task. Do not copy skills into editor-specific folders. Shared skills (`api-contract-sync`, `design-simplicity-principles`, `moh-designer`, `moh-marketing`, `ux-review`) are maintained in the API repository; interface-polish references are maintained in web. Synchronize their checked copies with the API `scripts/sync-agent-guidance.py` command; do not edit a mirror independently.

Detailed rules remain in `.cursor/rules/` as a single source. Cursor can attach them by glob or description; Codex should read the relevant files from the table below before editing that area. Do not load every rule or skill for every task. Paths in rules are relative to this repository unless a sibling repository is named.

## Web essentials

Nuxt + Vue + PrimeVue. Product data comes from the Nest API through `useApiClient()`; do not add a parallel Nuxt product API. Keep response types synchronized in `types/api.ts` and the generated contracts.

Internal navigation uses real anchors / `NuxtLink`, including clickable rows. Reuse design tokens, edge-to-edge layouts, and `moh-divide` separators. Preserve in-page state when tabs and filters change the URL. Server markup and the initial client render must match.

Mutable server state fetches on mount/activation and subscribes to `usePresence()` callbacks. Patch local state where possible; unsubscribe on teardown.

Use the [validation matrix](docs/engineering-policy.md#validation-matrix) for completion checks.

## Read the applicable detailed rules

| Task or concern | Rule |
| --- | --- |
| menofhunger-www core conventions (Nuxt + PrimeVue) | [00-project-overview](.cursor/rules/00-project-overview.mdc) |
| Apply the Men of Hunger product simplification algorithm before adding or changing web behavior | [10-product-algorithm](.cursor/rules/10-product-algorithm.mdc) |
| Keep feed concepts consistent across API, web, and iOS | [15-feed-surface](.cursor/rules/15-feed-surface.mdc) |
| Delete safely by checking cross-platform callers and choosing delete, redirect, handoff, or deprecate | [20-deletion-deprecation](.cursor/rules/20-deletion-deprecation.mdc) |
| Do not start dev servers/watchers (user runs them). | [25-no-dev-servers](.cursor/rules/25-no-dev-servers.mdc) |
| Keep local and CI loops fast; add automation only after simplifying the surface | [30-local-loop](.cursor/rules/30-local-loop.mdc) |
| Preserve in-page layout for tab and filter URL changes | [35-in-place-route-state](.cursor/rules/35-in-place-route-state.mdc) |
| Definition of done for substantive www features (lint, types, tests, build, hydration) | [40-feature-done-checklist](.cursor/rules/40-feature-done-checklist.mdc) |
| Internal navigation must render a real <a> element for cmd/middle/right-click "Open in new tab" to work | [40-internal-links](.cursor/rules/40-internal-links.mdc) |
| Hydration-safe defaults for Vue components, layouts, pages, and composables | [45-hydration-safe-defaults](.cursor/rules/45-hydration-safe-defaults.mdc) |
| Watch Party sync model for SpaceYouTubePlayer and related composables. Read when working on Spaces, watch-party playback, applyState, owner/viewer sync, or useWatchParty/usePresence for watch party events. | [50-watch-party-sync](.cursor/rules/50-watch-party-sync.mdc) |
| Pages must feel edge-to-edge. Never wrap an entire page or full section in a single bordered/rounded card. | [55-edge-to-edge-pages](.cursor/rules/55-edge-to-edge-pages.mdc) |
| List row separators use moh-divide (low-contrast). Never Tailwind divide-y. | [56-list-dividers](.cursor/rules/56-list-dividers.mdc) |
| Bell badge is unseen; list highlight is unread. Do not mix deliveredAt and readAt. | [56-notification-seen-vs-read](.cursor/rules/56-notification-seen-vs-read.mdc) |
| Real-time first — pages must reflect server-side changes live via websockets, with HTTP fetch as the on-mount sync. | [60-realtime-first](.cursor/rules/60-realtime-first.mdc) |
