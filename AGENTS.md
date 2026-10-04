# Men of Hunger — Web

Work directly on `main` in this repository. Do not create a feature branch or a new worktree unless the user explicitly requests one.

Read [engineering policy](docs/engineering-policy.md) for scope, dependency versions, product decisions, realtime contracts, and the validation matrix. Preserve unrelated working-tree changes. Inspect the nearest implementation before editing.

Skills live in `.agents/skills/<name>/SKILL.md`. Read a skill when its description matches the task. Do not copy skills into editor-specific folders. Shared skills (`api-contract-sync`, `design-simplicity-principles`, `moh-designer`, `moh-marketing`, `ux-review`) and shared rules `15-feed-surface`, `20-deletion-deprecation`, and `56-notification-seen-vs-read` are canonical in the API repository. Interface-polish references are canonical in web. `60-realtime-first` is platform-specific. Sync copies with the API `scripts/sync-agent-guidance.py`. Do not edit a mirror independently.

Detailed rules are in `.cursor/rules/`. Read a rule when its description matches the task. Do not load every rule or skill. Paths are relative to this repository unless a sibling repository is named.

## Web essentials

Nuxt + Vue + PrimeVue. Product data comes from the Nest API through `useApiClient()`. Do not add a parallel Nuxt product API. Keep response types synchronized in `types/api.ts` and the generated contracts.

Internal navigation uses real anchors and `NuxtLink`, including clickable rows. Reuse design tokens, edge-to-edge layouts, and `moh-divide` separators. Preserve in-page state when tabs and filters change the URL. Server markup and the initial client render must match.

Mutable server state fetches on mount or activation and subscribes to `usePresence()` callbacks. Patch local state where possible. Unsubscribe on teardown.

For every new or changed media upload, embed, or generated derivative, follow the [media ownership and review policy](docs/engineering-policy.md#media-ownership-and-review), including the API media-review resolver and orphan-deletion regression coverage, even when the upload UI change starts on web.

Use the [validation matrix](docs/engineering-policy.md#validation-matrix) for completion checks.
