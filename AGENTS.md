# Men of Hunger — Web

Work directly on `main` in this repository. Do not create a feature branch or a new worktree unless the user explicitly requests one.

Read the relevant sections of [engineering policy](docs/engineering-policy.md) for validation,
product/design decisions, realtime, media ownership, dependencies, and server/deploy boundaries.
Preserve unrelated changes and inspect the nearest implementation before editing.

Use `.agents/skills` when the task needs that workflow; `.cursor/rules` holds scoped project
constraints readable by Codex and Cursor. Do not load every file. Shared policy, contract/design/
marketing skills, and shared rule bodies are maintained in the API repository. Update mirrors
with its `scripts/sync-agent-guidance.py`, passing the active `--ios-root` for an iOS worktree.
Edit canonical sources rather than mirrors. Paths are relative to the owning repository.

## Web essentials

Nuxt + Vue + PrimeVue. Product data comes from the Nest API through `useApiClient()`. Do not add a parallel Nuxt product API. Keep response types synchronized in `types/api.ts` and the generated contracts.

Internal navigation uses real anchors and `NuxtLink`, including clickable rows. Reuse design tokens, edge-to-edge layouts, and `moh-divide` separators. Preserve in-page state when tabs and filters change the URL. Server markup and the initial client render must match.

Mutable server state fetches on mount or activation and subscribes to `usePresence()` callbacks. Patch local state where possible. Unsubscribe on teardown.

For every new or changed media upload, embed, or generated derivative, follow the [media ownership and review policy](docs/engineering-policy.md#media-ownership-and-review), including the API media-review resolver and orphan-deletion regression coverage, even when the upload UI change starts on web.

Use the [validation matrix](docs/engineering-policy.md#validation-matrix) for completion checks.
