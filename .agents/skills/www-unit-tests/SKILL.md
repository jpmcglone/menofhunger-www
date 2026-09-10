---
name: www-unit-tests
description: >-
  Write or fix menofhunger-www Vitest tests so they stay hermetic in CI/Render.
  Use when adding tests, when deploy fails on unit tests, when happy-dom throws
  Illegal invocation on WebSocket close, or when mockResolvedValueOnce leaks
  between cases.
---

# www unit tests

Read the [validation matrix](../../../docs/engineering-policy.md#validation-matrix)
row for Vitest config, stubs, client plugins, and `mock*Once`. Render's www
`prebuild` runs `npm test`. `npx nuxt build` does not.

Unit tests use **happy-dom**, not a browser.

## Do not open a real socket

Client plugins (`post-cache.client.ts`, `notifications-realtime-sync.client.ts`,
`crew-realtime-sync.client.ts`, …) call `usePresence()` while the Nuxt test app
boots. That calls `io()` from `socket.io-client`. engine.io then uses the `ws`
package; `close()` in happy-dom throws `TypeError: Illegal invocation` and can
fail a later test with a leftover `mockRejectedValueOnce`.

`vitest.config.ts` aliases `@sentry/nuxt`, `posthog-js`, and `socket.io-client`
to `tests/stubs/`. Do not remove those aliases. Do not import `engine.io-client`
or `ws` from app code. If a new client SDK opens network, timers, or sockets
during plugin boot, add a stub alias and a guardrail assertion in
`tests/vitest-socket-stub.test.ts`. Live sockets belong in browser/Playwright
checks.

## Reset `once` queues

`vi.clearAllMocks()` clears call history, not implementations. A
`mockRejectedValueOnce` that never ran will fire in the next `it`. Use
`mockReset()` on the spy in `beforeEach`, then re-apply default resolved values.

## Mock the module you actually call

`mockNuxtImport('usePresence', …)` does not stop plugins from using the real
composable. For auth/logout assertions, also `vi.mock('~/composables/usePresence')`
so `useAuth()` hits your spies. Include `addUsersCallback` when `useAuth`
registers on `app:mounted`.

Unmount `mount()` wrappers in `afterEach`.
