---
name: realtime-page-sync
description: Wire pages to real-time websocket events with HTTP fetch as on-mount sync. Use when adding or editing a Nuxt page/component that displays mutable server state (notifications, feeds, invites, posts, presence, badges, group/crew membership, watch parties), when the user reports "I had to refresh to see X", when adding a new domain that emits realtime events from the API, or when wiring a new `usePresence()` callback registry.
---

# Real-time page sync (Nuxt 3 + usePresence)

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

### 2. Mount: fetch then subscribe

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

onMounted(async () => {
  addNotificationsCallback(cb)
  await fetchList({ forceRefresh: false })
  await markDelivered()
})
onBeforeUnmount(() => removeNotificationsCallback(cb))
```

Order matters slightly: register the callback **before** the HTTP fetch resolves, so events that arrive during the fetch aren't dropped on the floor. Your patch reducer must be idempotent (dedupe by id) so a double-apply is safe.

### 3. Re-activate: re-fetch even if the socket is alive

Most app pages live inside `<KeepAlive>`. When the user navigates back, `onMounted` doesn't fire again — `onActivated` does. The socket subscription is still alive, but the device may have been backgrounded; refetch closes the gap.

```ts
onActivated(async () => {
  await fetchList({ forceRefresh: true })
})
```

### 4. Subscribe per-room when the gateway requires it

Posts, articles, spaces, and radio gate event delivery on a `subscribe*` call so the server doesn't fire firehose-of-everything at every socket. Always pair with `unsubscribe*` and re-subscribe when the route param changes:

```ts
onMounted(() => {
  addPostsCallback(postsCb)
  if (postId.value) subscribePosts([postId.value])
})

watch(() => postId.value, (pid, prev) => {
  if (prev) unsubscribePosts([prev])
  if (pid) subscribePosts([pid])
})

onBeforeUnmount(() => {
  removePostsCallback(postsCb)
  if (postId.value) unsubscribePosts([postId.value])
})
```

### 5. Patch in place, don't refetch on every event

The websocket payload mirrors the HTTP DTO. Splice it into your local list directly — refetching defeats the point of the socket.

```ts
function patchNotification(updated: Notification) {
  notifications.value = notifications.value.map((n) =>
    n.id === updated.id ? { ...n, ...updated } : n,
  )
}
```

Refetch only when the event tells you the cache can't be patched (e.g. structural reorder, deletion of an entity you don't have, "the world changed" signals like `notifications:undelivered-count` jumping by >1).

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

Symptom: "I navigated away and back, and now I'm missing the events that happened in between." Fix: add `onActivated(() => fetchList({ forceRefresh: true }))`.

### Subscribing without unsubscribing

Symptom: socket fan-out grows unbounded; old pages keep receiving events; leaked listeners cause double-renders. Fix: every `subscribe*` and `add*Callback` MUST have a paired `unsubscribe*` / `remove*Callback` in `onBeforeUnmount`.

### Refetching on every event

Symptom: chat lags; spaces flicker; you see N+1 HTTP calls in the network tab. Fix: patch the local ref with the payload (which is the full DTO).

### Defining a parallel "realtime model" type

Don't. The socket payload is the HTTP DTO. If you need to add a field for realtime delivery, add it to the DTO and let the HTTP response carry it too. This keeps the reducer code one path, not two.

### Routing socket events through the global cache only

The global feed cache (in `~/utils/feed-patch.ts`) handles `posts:live-updated` for any `AppPostRow` that's mounted. Pages that have **page-specific** concerns on top of that (comment lists, badge counts, redirect on delete) still need a local `addPostsCallback` — see `pages/p/[id].vue` for the canonical example.

### Forgetting the `useState` key for SSR

Pages that rely on `useState('key', …)` can hydrate twice if the key depends on auth (`me.value?.id`) and `me` isn't resolved server-side. For socket-driven pages this almost always means **don't SSR**: `definePageMeta({ ssr: false })` for auth-gated dashboards (notifications, settings, inbox, …). The hydration-safe-defaults rule covers this.

## Skipping the pattern

Static / marketing pages and one-shot composer dialogs do not need socket wiring. If a mutable-state page intentionally skips it, leave a one-line `// no realtime: <reason>` comment so the next reader knows it was a deliberate choice, not an oversight.

## Reference implementations

When in doubt, copy the pattern from one of these:

- `pages/notifications.vue` — list + badge + crew/group invite live patching, with `onActivated` refetch.
- `pages/p/[id].vue` — per-post subscription, comment add/delete, redirect-on-delete.
- `pages/s/[id].vue` and `composables/useWatchParty.ts` — spaces with subscribe + per-room state.
- `composables/useGroupInvites.ts` + `components/app/groups/InviteToGroupDialog.vue` — viewer-initiated mutation + optimistic UI + socket echo dedup.
