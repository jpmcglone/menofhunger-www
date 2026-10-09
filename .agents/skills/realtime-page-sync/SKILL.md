---
name: realtime-page-sync
description: Keep MOH web pages synchronized through usePresence and activation fetches; fix refresh-only updates or leaked callbacks.
---

# Realtime page sync

Use the shared `usePresence()` facade for mutable server state, plus an HTTP catch-up on
mount/activation. Pages own their listeners; shared domain stores may own longer-lived ones.
Do not open a second socket.

`composables/presence/types.ts` owns payload/callback types. Domain registries live in
`usePresenceDomains.ts`, handlers in `registerPresence*Handlers.ts`, and room reference
counts in `usePresenceSubscriptions.ts`. Extend those owners instead of adding another
transport implementation to the facade. Read the nearest working domain before editing.

Use one guarded activation path: register callbacks and required rooms before fetching;
`onMounted` and `onActivated` can both run on initial mount. Deactivation/unmount removes
page callbacks, leaves rooms, and cancels queued refreshes. On route identity changes,
leave the old room and clear scoped state before joining the new one. Reconnect and
reactivation fetch missed changes.

Snapshots, typed patches, removals and invalidations follow the
[shared realtime policy](../../../docs/engineering-policy.md#realtime-contracts-and-ownership).
Reject stale HTTP/session results, dedupe mutation/socket echoes by ID, and coalesce a
required refresh rather than fetching once per event. Preserve a dirty flag while a
request is running so one follow-up refresh catches changes that arrived during it.

Examples: `pages/p/[id].vue`, `pages/notifications.vue`, `composables/useGroupInvites.ts`,
and `composables/useWatchParty.ts`. Ensure the backend emits the required event. Static
content and closing one-shot flows need no subscription; document a deliberate exception
for mutable secondary surfaces.
