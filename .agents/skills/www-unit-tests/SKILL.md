---
name: www-unit-tests
description: Keep MOH Vitest tests hermetic, especially client-plugin boot, socket mocks and mockOnce queues.
---

# Web unit tests

Vitest uses happy-dom. Preserve `vitest.config.ts` aliases for Socket.IO, Sentry and
PostHog in `tests/stubs/`: client plugins can call the real `usePresence()` even when
a test mocks a Nuxt auto-import. Real sockets and browser behavior belong in runtime checks.
A new SDK that opens connections during plugin boot needs an equivalent stub.

`vi.clearAllMocks()` preserves implementations and queued `mock*Once` values. Use
`mockReset()` in setup, then restore defaults. For auth/presence assertions, mock the
module `~/composables/usePresence` actually called by `useAuth`; include the callback
methods it registers. Unmount wrappers and clear owned timers in teardown.

`npm run build` does not run unit tests: `prebuild` only bumps the service-worker version.
Run the appropriate test gate from the
[validation matrix](../../../docs/engineering-policy.md#validation-matrix).
