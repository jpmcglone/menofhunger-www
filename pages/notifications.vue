<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div class="sticky top-0 z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
      <div class="relative z-10 flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div class="min-w-0">
          <div class="text-base sm:text-lg font-semibold text-balance">Notifications</div>
        </div>
        <Button
          v-if="notifications.length > 0"
          label="Mark all as read"
          text
          severity="secondary"
          :disabled="loading || markingAllRead"
          @click="onMarkAllRead"
        />
      </div>
      <AppHorizontalScroller
        class="relative z-10"
        scroller-class="no-scrollbar px-3 pb-2.5 sm:px-4"
      >
        <div class="flex gap-1.5">
          <button
            v-for="chip in kindChips"
            :key="chip.kind ?? 'all'"
            class="relative shrink-0 inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium transition-colors"
            :class="activeKind === chip.kind
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:hover:bg-zinc-700'"
            :aria-pressed="activeKind === chip.kind"
            @click="onChipSelect(chip.kind)"
          >
            <span
              class="pointer-events-none absolute inset-0 rounded-full border transition-opacity duration-200 ease-out"
              :class="chipHasUnseenNotifications(chip.kind)
                ? 'opacity-100 border-amber-400/80 dark:border-amber-300/80'
                : 'opacity-0 border-transparent'"
              aria-hidden="true"
            />
            <span class="relative z-[1]">{{ chip.label }}</span>
          </button>
        </div>
      </AppHorizontalScroller>
    </div>

    <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[220px]">
      <div v-if="fetchError" class="px-3 py-6 sm:px-4 sm:py-8">
        <AppInlineAlert severity="danger">
          <AppUserErrorMessage :error="fetchError" fallback="Could not load notifications." />
        </AppInlineAlert>
        <div class="mt-4 flex justify-center">
          <Button
            label="Try again"
            severity="secondary"
            rounded
            :loading="loading"
            :disabled="loading"
            @click="retryFetch"
          />
        </div>
      </div>
      <div
        v-else-if="!notifications.length"
        class="px-3 py-6 sm:px-4 sm:py-8 text-center"
      >
        <p class="text-[13px] sm:text-sm text-gray-500 dark:text-gray-400">
          No notifications yet.
        </p>
        <p class="mt-1 text-[13px] sm:text-sm moh-text-muted">
          {{ VOICE.feed.emptyBody }}
        </p>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button as="NuxtLink" to="/explore" :label="VOICE.actions.explore" severity="secondary" rounded size="small" />
          <Button as="NuxtLink" to="/who-to-follow" :label="VOICE.actions.findPeople" severity="secondary" rounded size="small" />
        </div>
      </div>
      <div v-else class="relative z-0">
        <TransitionGroup name="notifications-list" tag="div" class="moh-divide transition-opacity duration-150">
          <div
            v-for="(item, idx) in notifications"
            :key="itemKey(item)"
            class="relative hover:bg-gray-50 dark:hover:bg-zinc-900"
            :class="[
              itemHref(item) ? 'cursor-pointer' : '',
              stickyHighlightedItemKeys.has(itemKey(item))
                ? 'bg-gray-50/80 dark:bg-zinc-900/40'
                : '',
            ]"
            :role="itemHref(item) ? 'link' : undefined"
            :tabindex="itemHref(item) ? 0 : undefined"
            @click.capture="onNotificationInteractionCapture(item)"
            @auxclick.capture="onNotificationInteractionCapture(item)"
            @click="onNotificationClick(item, $event)"
            @auxclick="onNotificationAuxClick(item, $event)"
            @keydown.enter.prevent="onNotificationKeydown(item)"
            @keydown.space.prevent="onNotificationKeydown(item)"
          >
            <!-- Background anchor: aria-hidden so it's invisible to assistive tech and
                 tabindex="-1" so it's skipped by keyboard, but present in the DOM so
                 right-click → "Open in new tab" and cmd/ctrl+click work natively. -->
            <NuxtLink
              v-if="itemHref(item)"
              :to="itemHref(item)!"
              class="absolute inset-0 z-[1]"
              tabindex="-1"
              aria-hidden="true"
            />
            <div class="relative z-[2]">
              <!-- Flat repost: "X reposted" header + the original post content -->
              <template v-if="item.type === 'single' && notificationIsFlatRepost(item.notification)">
                <AppPostRepostHeader :post="item.notification.post!" />
                <AppPostRow
                  :post="item.notification.post!.repostedPost!"
                  :clickable="false"
                  :highlight="stickyHighlightedItemKeys.has(itemKey(item))"
                  no-border-bottom
                />
              </template>
              <AppPostRow
                v-else-if="item.type === 'single' && notificationShowsPostRow(item.notification)"
                :post="item.notification.post!"
                :clickable="false"
                :highlight="stickyHighlightedItemKeys.has(itemKey(item))"
                show-replying-to
                no-border-bottom
              />
              <AppNotificationRow
                v-else-if="item.type === 'single'"
                :notification="item.notification"
                :nudge-is-topmost="nudgeIsTopmostByIndex[idx] ?? false"
              />
              <AppNotificationFollowedPostsRollupRow
                v-else-if="item.type === 'followed_posts_rollup'"
                :rollup="item.rollup"
              />
              <AppNotificationGroupRow
                v-else
                :group="item.group"
                :nudge-is-topmost="nudgeIsTopmostByIndex[idx] ?? false"
              />
            </div>
          </div>
        </TransitionGroup>

        <div v-if="nextCursor && !loading" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <Button
            label="Load more"
            text
            severity="secondary"
            :loading="loadingMore"
            @click="loadMore"
          />
        </div>
        <div v-else-if="loadingMore" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <div class="inline-flex transition-opacity duration-150">
            <AppLogoLoader compact />
          </div>
        </div>
      </div>
    </AppSubtleSectionLoader>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { Notification, NotificationKind } from '~/types/api'
import { VOICE } from '~/config/voice'
import { closeBrowserNotificationsForHref } from '~/utils/browser-notifications'

/** Kinds that render as a full AppPostRow when `notification.post` is hydrated. */
const POST_ROW_KINDS = new Set<NotificationKind>(['comment', 'mention', 'followed_post', 'checkin_post', 'repost'])

function notificationShowsPostRow(n: Notification): boolean {
  if (!n.post || !POST_ROW_KINDS.has(n.kind)) return false
  // A flat repost (kind=repost, no body) only renders usefully when repostedPost is hydrated.
  // Without it PostRow shows an empty shell; fall back to NotificationRow which shows the snippet.
  if (n.kind === 'repost' && n.post.kind === 'repost' && !n.post.repostedPost) return false
  return true
}

function notificationIsFlatRepost(n: Notification): boolean {
  return Boolean(
    n.post && n.kind === 'repost' && n.post.kind === 'repost' && n.post.repostedPost,
  )
}

definePageMeta({
  layout: 'app',
  title: 'Notifications',
  hideTopBar: true,
})

usePageSeo({
  title: 'Notifications',
  description: 'Notifications for Men of Hunger — replies, follows, and updates from your network.',
  canonicalPath: '/notifications',
  noindex: true,
})

const {
  notifications,
  nextCursor,
  loading,
  hasFetched,
  fetchError,
  pendingRefresh,
  activeKind,
  unreadByKind,
  setKind,
  fetchList,
  markDelivered,
  markReadById,
  markAllRead,
  clearUnreadKind,
  decrementUnreadKind,
  itemHref,
} = useNotifications()

async function retryFetch() {
  await fetchList({ forceRefresh: true })
}
const { isPageAccount } = useAuth()
const notificationsTabReturnGate = useTabReturnRefreshGate('notifications')

const kindChips = computed(() => {
  const chips: { label: string; kind: NotificationKind | 'other' | null }[] = [
    { label: 'All', kind: null },
    { label: 'Replies', kind: 'comment' },
    { label: 'Mentions', kind: 'mention' },
    { label: 'Posts', kind: 'followed_post' },
    { label: 'Statuses', kind: 'status_update' },
    { label: 'Check-ins', kind: 'checkin_post' },
    { label: 'Follows', kind: 'follow' },
    { label: 'Boosts', kind: 'boost' },
    { label: 'Other', kind: 'other' },
  ]
  return isPageAccount.value ? chips.filter((chip) => chip.kind !== 'checkin_post') : chips
})

const router = useRouter()
const route = useRoute()

async function onChipSelect(kind: NotificationKind | 'other' | null) {
  await setKind(kind)
  const query = { ...route.query }
  if (kind) {
    query.kind = kind
  } else {
    delete query.kind
  }
  void router.replace({ query })
}

const notifBadge = useNotificationsBadge()
const {
  setNotificationUndeliveredCount,
  addInterest,
  removeInterest,
  addCrewCallback,
  removeCrewCallback,
  addGroupInviteCallback,
  removeGroupInviteCallback,
} = usePresence()
const loadingMore = ref(false)
const markingAllRead = ref(false)
const stickyHighlightedItemKeys = ref<Set<string>>(new Set())

// When a post is viewed elsewhere, applyClearedPostIds sets readAt — drop sticky highlight.
watch(
  notifications,
  (list) => {
    const next = new Set(stickyHighlightedItemKeys.value)
    let changed = false
    for (const item of list) {
      if (item.type === 'single' && item.notification.readAt) {
        const key = itemKey(item)
        if (next.delete(key)) changed = true
      }
      if (item.type === 'group' && item.group.readAt) {
        const key = itemKey(item)
        if (next.delete(key)) changed = true
      }
    }
    if (changed) stickyHighlightedItemKeys.value = next
  },
  { deep: true },
)
// Show the full-page loader on first visit (never fetched) OR when arriving with
// unread badge count > 0 — new notifications came in while we were away and we
// don't want to flash the stale list before the fresh fetch lands.
const entryPending = ref(false)
const showInitialLoader = computed(() => !hasFetched.value || entryPending.value)

function chipHasUnseenNotifications(kind: NotificationKind | 'other' | null): boolean {
  if (kind === 'other') {
    const total = Math.max(0, Number(unreadByKind.value.all ?? 0) || 0)
    const primarySum = (['comment', 'mention', 'followed_post', 'status_update', 'checkin_post', 'follow', 'boost'] as NotificationKind[])
      .reduce((sum, k) => sum + Math.max(0, Number(unreadByKind.value[k] ?? 0) || 0), 0)
    return Math.max(0, total - primarySum) > 0
  }
  const key = kind ?? 'all'
  return Math.max(0, Number(unreadByKind.value[key] ?? 0) || 0) > 0
}

function nudgeActorIdForItem(item: (typeof notifications.value)[number]): string | null {
  if (item.type === 'single') {
    if (item.notification.kind !== 'nudge') return null
    return item.notification.actor?.id ?? null
  }
  if (item.type !== 'group') return null
  if (item.group.kind !== 'nudge') return null
  return item.group.actors?.[0]?.id ?? null
}

function itemKey(item: (typeof notifications.value)[number]): string {
  if (item.type === 'single') return `single:${item.notification.id}`
  if (item.type === 'group') return `group:${item.group.id}`
  return `rollup:${item.rollup.id}`
}

function itemDeliveredAt(item: (typeof notifications.value)[number]): string | null {
  if (item.type === 'single') return item.notification.deliveredAt
  if (item.type === 'group') return item.group.deliveredAt
  return item.rollup.deliveredAt
}

function pinEntryHighlights(count: number) {
  const targetCount = Math.max(0, Math.floor(count))
  if (targetCount === 0) return

  const undelivered = notifications.value.filter(item => !itemDeliveredAt(item))
  const delivered = notifications.value.filter(item => itemDeliveredAt(item))
  const next = new Set(stickyHighlightedItemKeys.value)
  const candidates = [...undelivered, ...delivered].filter(item => !next.has(itemKey(item)))
  for (const item of candidates.slice(0, targetCount)) {
    next.add(itemKey(item))
  }
  stickyHighlightedItemKeys.value = next
}

// Only show the "Nudge back" action on the newest nudge row/group per actor.
const nudgeIsTopmostByIndex = computed(() => {
  const seen = new Set<string>()
  return notifications.value.map((item) => {
    const actorId = nudgeActorIdForItem(item)
    if (!actorId) return false
    if (seen.has(actorId)) return false
    seen.add(actorId)
    return true
  })
})

// Presence: subscribe to notification actors so avatars show online/offline (works after hard refresh).
const notificationActorIds = computed(() => {
  const ids = new Set<string>()
  for (const item of notifications.value) {
    if (item.type === 'single') {
      const id = item.notification.actor?.id
      if (id) ids.add(id)
      continue
    }
    if (item.type === 'group') {
      for (const a of item.group.actors ?? []) {
        const id = a?.id
        if (id) ids.add(id)
      }
    }
  }
  return [...ids]
})
const presenceAddedIds = ref<Set<string>>(new Set())
watch(
  notificationActorIds,
  (newIds) => {
    const added = presenceAddedIds.value
    const toRemove = [...added].filter((id) => !newIds.includes(id))
    const toAdd = newIds.filter((id) => !added.has(id))
    if (toRemove.length) {
      removeInterest(toRemove)
      toRemove.forEach((id) => added.delete(id))
    }
    if (toAdd.length) {
      addInterest(toAdd)
      toAdd.forEach((id) => added.add(id))
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const added = [...presenceAddedIds.value]
  if (added.length) removeInterest(added)
})

// Realtime: when a crew invite's status changes (accepted / declined / cancelled
// / expired) — possibly from another tab or device — patch any matching
// `crew_invite_received` rows in place so their inline buttons swap to the
// terminal indicator without requiring a refresh.
const crewCb = {
  onInviteUpdated(payload: { invite: { id: string; status: string } }) {
    const inviteId = payload?.invite?.id
    const status = payload?.invite?.status as
      | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | undefined
    if (!inviteId || !status) return
    let mutated = false
    const next = notifications.value.map((item) => {
      if (item.type !== 'single') return item
      const n = item.notification
      if (n.kind !== 'crew_invite_received') return item
      if (n.subjectCrewInviteId !== inviteId) return item
      mutated = true
      return {
        ...item,
        notification: { ...n, subjectCrewInviteStatus: status },
      }
    })
    if (mutated) notifications.value = next
  },
}
onMounted(() => addCrewCallback(crewCb))
onBeforeUnmount(() => removeCrewCallback(crewCb))

// Realtime: same pattern for community group invites — keep the row's terminal
// state in sync when the invite is accepted / declined / cancelled / expired
// from another tab or device.
const groupInviteCb = {
  onUpdated(payload: { invite: { id: string; status: string } }) {
    const inviteId = payload?.invite?.id
    const status = payload?.invite?.status as
      | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | undefined
    if (!inviteId || !status) return
    let mutated = false
    const next = notifications.value.map((item) => {
      if (item.type !== 'single') return item
      const n = item.notification
      if (n.kind !== 'community_group_invite_received') return item
      if (n.subjectCommunityGroupInviteId !== inviteId) return item
      mutated = true
      return {
        ...item,
        notification: { ...n, subjectCommunityGroupInviteStatus: status },
      }
    })
    if (mutated) notifications.value = next
  },
}
onMounted(() => addGroupInviteCallback(groupInviteCb))
onBeforeUnmount(() => removeGroupInviteCallback(groupInviteCb))

async function onMarkAllRead() {
  markingAllRead.value = true
  try {
    await markAllRead()
    clearUnreadKind('all')
    stickyHighlightedItemKeys.value = new Set()
    const now = new Date().toISOString()
    notifications.value = notifications.value.map((item) => {
      if (item.type === 'single') {
        return { ...item, notification: { ...item.notification, readAt: now } }
      }
      if (item.type === 'group') return { ...item, group: { ...item.group, readAt: now } }
      return { ...item, rollup: { ...item.rollup, readAt: now } }
    })
  } finally {
    markingAllRead.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    await fetchList({ cursor: nextCursor.value })
  } finally {
    loadingMore.value = false
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      [
        'a',
        'button',
        'iframe',
        'video',
        'audio',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="menu"]',
        '[role="menuitem"]',
        '[contenteditable="true"]',
        '[data-pc-section]',
      ].join(','),
    ),
  )
}

/**
 * Optimistically mark a feed item as read+seen in local state and on the server.
 * Used when the user opens a notification (including new-tab opens) so the row
 * stops showing as unread immediately, instead of waiting for the destination
 * page to fire markReadBySubject + the websocket to round-trip.
 *
 * Groups/rollups carry a representative id; markReadById on that id won't clear
 * every underlying notification — but the row's visible "unread" styling reads
 * off the group/rollup's own readAt, which we update locally. The destination
 * page's `markReadBySubject` will then clear the rest server-side.
 */
function markItemReadOptimistic(item: (typeof notifications.value)[number]) {
  const nextHighlights = new Set(stickyHighlightedItemKeys.value)
  nextHighlights.delete(itemKey(item))
  stickyHighlightedItemKeys.value = nextHighlights

  const now = new Date().toISOString()
  let id: string | null = null
  let unreadKind: NotificationKind | null = null
  let changed = false
  notifications.value = notifications.value.map((curr) => {
    if (curr.type === 'single') {
      if (item.type !== 'single' || curr.notification.id !== item.notification.id) return curr
      id = curr.notification.id
      if (curr.notification.readAt) return curr
      unreadKind = curr.notification.kind
      changed = true
      return {
        ...curr,
        notification: {
          ...curr.notification,
          readAt: now,
          deliveredAt: curr.notification.deliveredAt ?? now,
        },
      }
    }
    if (curr.type === 'group') {
      if (item.type !== 'group' || curr.group.id !== item.group.id) return curr
      id = curr.group.id
      if (curr.group.readAt) return curr
      unreadKind = curr.group.kind
      changed = true
      return {
        ...curr,
        group: { ...curr.group, readAt: now, deliveredAt: curr.group.deliveredAt ?? now },
      }
    }
    if (item.type !== 'followed_posts_rollup' || curr.rollup.id !== item.rollup.id) return curr
    if (curr.rollup.readAt) return curr
    unreadKind = 'followed_post'
    changed = true
    return {
      ...curr,
      rollup: { ...curr.rollup, readAt: now, deliveredAt: curr.rollup.deliveredAt ?? now },
    }
  })
  if (changed) decrementUnreadKind(unreadKind)
  if (id) void markReadById(id)
  closeBrowserNotificationsForHref(itemHref(item))
}

function onNotificationInteractionCapture(item: (typeof notifications.value)[number]) {
  if (item.type !== 'single') return
  if (!notificationShowsPostRow(item.notification)) return
  markItemReadOptimistic(item)
}

function onNotificationClick(item: (typeof notifications.value)[number], e: MouseEvent) {
  const href = itemHref(item)
  if (!href) return
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    markItemReadOptimistic(item)
    window.open(href, '_blank')
    return
  }
  markItemReadOptimistic(item)
  void navigateTo(href)
}

function onNotificationAuxClick(item: (typeof notifications.value)[number], e: MouseEvent) {
  if (e.button !== 1) return
  const href = itemHref(item)
  if (!href) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  markItemReadOptimistic(item)
  window.open(href, '_blank')
}

function onNotificationKeydown(item: (typeof notifications.value)[number]) {
  const href = itemHref(item)
  if (!href) return
  markItemReadOptimistic(item)
  void navigateTo(href)
}

function kindFromQuery(): NotificationKind | 'other' | null {
  const q = route.query.kind
  if (q === 'other') return 'other'
  if (isPageAccount.value && q === 'checkin_post') return null
  const valid: NotificationKind[] = ['comment', 'boost', 'repost', 'follow', 'followed_post', 'followed_article', 'mention', 'nudge', 'coin_transfer', 'poll_results_ready', 'generic', 'status_update', 'checkin_post', 'account_verified', 'premium_started', 'premium_ended']
  return (typeof q === 'string' && valid.includes(q as NotificationKind)) ? (q as NotificationKind) : null
}

let lastDeliveredMarkAt = 0
function markDeliveredInBackground(force = false) {
  if (import.meta.client && document.visibilityState !== 'visible') return
  const now = Date.now()
  if (!force && now - lastDeliveredMarkAt < 1_000) return
  lastDeliveredMarkAt = now
  void markDelivered()
  setNotificationUndeliveredCount(0)
}

let entrySyncPromise: Promise<void> | null = null
function syncNotificationsOnEntry() {
  if (entrySyncPromise) return entrySyncPromise
  entrySyncPromise = (async () => {
    const badgeCountAtEntry = notifBadge.count.value
    const kind = kindFromQuery()
    const missedWhileAway = pendingRefresh.value
    if (kind !== activeKind.value || !hasFetched.value) {
      await setKind(kind)
      notificationsTabReturnGate.markSuccess()
    } else if (badgeCountAtEntry > 0 || missedWhileAway || notificationsTabReturnGate.shouldRefresh()) {
      await fetchList({ forceRefresh: true })
      notificationsTabReturnGate.markSuccess()
    }
    pinEntryHighlights(badgeCountAtEntry)
    markDeliveredInBackground(true)
  })().finally(() => {
    entrySyncPromise = null
  })
  return entrySyncPromise
}

onMounted(() => {
  if (notifBadge.count.value > 0) entryPending.value = true
  void syncNotificationsOnEntry().finally(() => { entryPending.value = false })
})

onActivated(() => {
  if (notifBadge.count.value > 0) entryPending.value = true
  void syncNotificationsOnEntry().finally(() => { entryPending.value = false })
})

watch(() => route.query.kind, async () => {
  const kind = kindFromQuery()
  if (kind !== activeKind.value) {
    await setKind(kind)
  }
})

onUnmounted(() => {
  notifBadge.fetchUndeliveredCount?.()
})

// Refetch list when socket says new notifications arrived (count increased).
// Use forceRefresh so we refetch even when we already have data (user is on the page).
// Only auto-mark delivered if the page is currently visible; if it's a background tab,
// skip so the badge isn't silently cleared before the user returns to the app.
const { notificationUndeliveredCount } = usePresence()
watch(notificationUndeliveredCount, (newVal, oldVal) => {
  if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal > oldVal) {
    // KeepAlive leaves this page mounted on /home. Fetching + mark-delivered
    // there cleared the badge and pendingRefresh, so All stayed stale until
    // a hard refresh. Only treat arrivals as seen while this route is open.
    if (route.path !== '/notifications') return
    if (import.meta.client && document.visibilityState !== 'visible') return
    const addedCount = newVal - oldVal
    void fetchList({ forceRefresh: true }).then(() => {
      pinEntryHighlights(addedCount)
      markDeliveredInBackground(true)
    })
  }
})

// No SSR fetch: notifications use a useState key derived from me.value?.id,
// which may not be resolved during client hydration, causing a state-key mismatch
// and hydration errors. The page is auth-gated so SSR data provides no SEO value.
</script>

<style scoped>
.notifications-list-enter-active,
.notifications-list-leave-active {
  transition: opacity 0.15s ease;
}

.notifications-list-enter-from,
.notifications-list-leave-to {
  opacity: 0;
}

.notifications-list-move {
  transition: transform 0.2s ease;
}
</style>
