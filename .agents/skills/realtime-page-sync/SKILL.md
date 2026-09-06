---
name: realtime-page-sync
description: Wire pages to real-time websocket events with HTTP fetch as on-mount sync. Use when adding or editing a Nuxt page/component that displays mutable server state (notifications, feeds, invites, posts, presence, badges, group/crew membership, watch parties), when the user reports "I had to refresh to see X", when adding a new domain that emits realtime events from the API, or when wiring a new `usePresence()` callback registry.
---

# Real-time page sync (Nuxt + usePresence)

This is the canonical pattern for "the page should update without a refresh". It's how every server-driven surface in this app is supposed to behave by default — `60-realtime-first.mdc` is the rule, this skill is the recipe.

## Mental model

| Layer | Job |
|---|---|
| `useApiClient()` (HTTP) | "Catch me up to the current state." Runs on `onMounted` and `onActivated`. |
| `usePresence()` (websocket) | "Keep me in sync going forward." Runs while the page is alive. |
| Local `ref` / `useState` | The single thing the template binds to. Both layers patch this. |

Both layers exist for every mutable-state page. Treat them as two halves of one feature, not as separate concerns.

## Step-by-step recipe

### 1. Pick the right callback registry

`usePresence()` exposes per-domain callback registries. Pick the one that matches your domain:

| Registry | Source events |
|---|---|
| `addPostsCallback` / `subscribePosts` | `posts:live-updated`, `posts:comment-added`, `posts:comment-deleted`, etc. (per-post room) |
| `addArticlesCallback` / `subscribeArticles` | Article comment + reaction events (per-article room) |
| `addNotificationsCallback` | `notifications:new`, `notifications:updated`, `notifications:deleted` |
| `addOnlineFeedCallback` | Presence online/offline + snapshot events |
| `addCrewCallback` / `addGroupInviteCallback` | Crew + group invite lifecycle |
| `addSpacesCallback` / `subscribeSpaces` | Space members, chat, watch party state |
| `addRadioCallback` / `subscribeRadio` | Radio chat, lobby counts, listeners |
| `addMessagesCallback` | DMs |

If your domain doesn't have one yet:
1. Add the typed payload + callback type at the top of `composables/usePresence.ts`.
2. Add a `useState` callback set + `add*Callback` / `remove*Callback` pair.
3. Wire the `socket.on('<domain>:<event>', …)` listener to fan out to the set.
4. Add the matching `emit*` in `menofhunger-api/src/modules/presence/presence-realtime.service.ts`.

Keep the names symmetric: `groups:invite-received` ↔ `addGroupInviteCallback({ onReceived })`.

### 2. Activate: subscribe, then fetch

```ts
const {
  notifications,
  fetchList,
  markDelivered,
} = useNotifications()

const { addNotificationsCallback, removeNotificationsCallback } = usePresence()

const cb: NotificationsCallback = {
  onNew:     (payload) => prependNotification(payload.notification),
  onUpdated: (payload) => patchNotification(payload.notification),
  onDeleted: (payload) => removeNotificationById(payload.notificationId),
}

let active = false
async function activate() {
  if (active) return
  active = true
  addNotificationsCallback(cb)
  await fetchList({ forceRefresh: true })
  if (active) await markDelivered()
}
function deactivate() {
  if (!active) return
  active = false
  removeNotificationsCallback(cb)
}
onMounted(activate)
onActivated(activate)
onDeactivated(deactivate)
onBeforeUnmount(deactivate)
```

Order matters slightly: register the callback **before** the HTTP fetch resolves, so events that arrive during the fetch aren't dropped on the floor. Your patch reducer must be idempotent (dedupe by id) so a double-apply is safe.

### 3. Re-activate without duplicate initial work

`onMounted` and `onActivated` both run on a kept-alive component's initial mount.
Use the guarded activation above so that first appearance fetches once. Deactivate
page-owned listeners and pending refresh timers when the page is hidden; activation
resubscribes and catches up. Shared domain stores may retain their own subscriptions.
Fetch/reducer code must follow the [realtime policy](../../../docs/engineering-policy.md#realtime-contracts-and-ownership)
for event races, reconnects, identity changes, and stale responses.

### 4. Subscribe per-room when the gateway requires it

Posts, articles, spaces, and radio use `subscribe*` to scope event delivery. Add
room subscriptions in the guarded activation function and pair them with
`unsubscribe*` in deactivation. When a route ID changes, leave the old room, clear
its scoped state, and join the new room only if active. Avoid a second independent
mount/activation registration alongside the lifecycle above.

### 5. Patch in place, don't refetch on every event

Choose the snapshot, typed patch, removal, or invalidation shape from the [realtime policy](../../../docs/engineering-policy.md#realtime-contracts-and-ownership). The example below merges a complete notification snapshot; a partial event must use its declared patch type.

```ts
function patchNotification(updated: Notification) {
  notifications.value = notifications.value.map((n) =>
    n.id === updated.id ? { ...n, ...updated } : n,
  )
}
```

When an event cannot safely recompute an aggregate, filter it to the visible scope and coalesce the refetch. If a request is already running, preserve a dirty flag and perform one follow-up refresh after it completes. Clear queued work on deactivation or identity changes.

### 6. Optimistic UI for viewer-initiated changes

When the viewer is the actor (sent invite, posted comment, accepted/declined), update local state right after the HTTP call resolves. Don't wait for the socket echo — but DO write the reducer so the echo is a no-op:

```ts
async function onAcceptGroupInvite() {
  const res = await groupInvites.acceptInvite(inviteId)
  groupInviteLocalState.value = 'accepted'   // optimistic
  // The socket echo (groups:invite-updated) will hit the registry shortly
  // after; the reducer below dedupes by id and is therefore idempotent.
}
```

## Common pitfalls

### Forgetting `onActivated`

Symptom: "I navigated away and back, and now I'm missing the events that happened in between." Fix: use the guarded activation/deactivation lifecycle above.

### Subscribing without unsubscribing

Symptom: socket fan-out grows unbounded; old pages keep receiving events; leaked listeners cause double-renders. Fix: pair page-owned `subscribe*` / `add*Callback` calls with `unsubscribe*` / `remove*Callback` on deactivation and unmount; keep cleanup idempotent.

### Refetching on every event

Symptom: chat lags; spaces flicker; you see N+1 HTTP calls in the network tab. Fix: merge the typed snapshot or patch according to the [realtime policy](../../../docs/engineering-policy.md#realtime-contracts-and-ownership).

### Defining a parallel "realtime model" type

Snapshots reuse canonical DTOs; named partial patches reuse field types. Follow the [realtime policy](../../../docs/engineering-policy.md#realtime-contracts-and-ownership).

### Routing socket events through the global cache only

The global feed cache (in `~/utils/feed-patch.ts`) handles `posts:live-updated` for any `AppPostRow` that's mounted. Pages that have **page-specific** concerns on top of that (comment lists, badge counts, redirect on delete) still need a local `addPostsCallback` — see `pages/p/[id].vue` for the canonical example.

### Forgetting the `useState` key for SSR

Use request-isolated state and stable keys during hydration; follow the [SSR skill](../ssr-hydration/SKILL.md) for auth boundaries and route rendering.

## Skipping the pattern

Static / marketing pages and one-shot composer dialogs do not need socket wiring. If a mutable-state page intentionally skips it, leave a one-line `// no realtime: <reason>` comment so the next reader knows it was a deliberate choice, not an oversight.

## Reference implementations

When in doubt, copy the pattern from one of these:

- `pages/notifications.vue` — list + badge + crew/group invite live patching, with `onActivated` refetch.
- `pages/p/[id].vue` — per-post subscription, comment add/delete, redirect-on-delete.
- `pages/s/[id].vue` and `composables/useWatchParty.ts` — spaces with subscribe + per-room state.
- `composables/useGroupInvites.ts` + `components/app/groups/InviteToGroupDialog.vue` — viewer-initiated mutation + optimistic UI + socket echo dedup.
