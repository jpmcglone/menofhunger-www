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
      <div
        v-if="!notifications.length"
        class="px-3 py-6 sm:px-4 sm:py-8 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400"
      >
        No notifications yet.
      </div>
      <div v-else class="relative z-0">
        <TransitionGroup name="notifications-list" tag="div" class="divide-y divide-gray-200 dark:divide-zinc-800 transition-opacity duration-150">
          <div
            v-for="(item, idx) in notifications"
            :key="itemKey(item)"
            class="relative hover:bg-gray-50 dark:hover:bg-zinc-900"
            :class="itemHref(item) ? 'cursor-pointer' : ''"
            :role="itemHref(item) ? 'link' : undefined"
            :tabindex="itemHref(item) ? 0 : undefined"
            @click="onNotificationClick(item, $event)"
            @auxclick="onNotificationAuxClick(item, $event)"
            @keydown.enter.prevent="itemHref(item) ? navigateTo(itemHref(item)!) : undefined"
            @keydown.space.prevent="itemHref(item) ? navigateTo(itemHref(item)!) : undefined"
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
              <AppNotificationRow
                v-if="item.type === 'single'"
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
import type { NotificationKind } from '~/types/api'
import { closeBrowserNotificationsForHref } from '~/utils/browser-notifications'

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

const kindChips: { label: string; kind: NotificationKind | null }[] = [
  { label: 'All', kind: null },
  { label: 'Mentions', kind: 'mention' },
  { label: 'Comments', kind: 'comment' },
  { label: 'Follows', kind: 'follow' },
  { label: 'Boosts', kind: 'boost' },
  { label: 'New Posts', kind: 'followed_post' },
]

const router = useRouter()
const route = useRoute()

async function onChipSelect(kind: NotificationKind | null) {
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
// Show the full-page loader until the first fetch completes. After that, keep
// existing data visible during background refreshes — never blank the list mid-flight.
const showInitialLoader = computed(() => !hasFetched.value)

function chipHasUnseenNotifications(kind: NotificationKind | null): boolean {
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
      ['a', 'button', 'iframe', 'input', 'textarea', 'select', '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
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
  const now = new Date().toISOString()
  let id: string | null = null
  let unreadKind: NotificationKind | null = null
  notifications.value = notifications.value.map((curr) => {
    if (curr !== item) return curr
    if (curr.type === 'single') {
      id = curr.notification.id
      if (curr.notification.readAt) return curr
      unreadKind = curr.notification.kind
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
      id = curr.group.id
      if (curr.group.readAt) return curr
      unreadKind = curr.group.kind
      return {
        ...curr,
        group: { ...curr.group, readAt: now, deliveredAt: curr.group.deliveredAt ?? now },
      }
    }
    if (curr.rollup.readAt) return curr
    unreadKind = 'followed_post'
    return {
      ...curr,
      rollup: { ...curr.rollup, readAt: now, deliveredAt: curr.rollup.deliveredAt ?? now },
    }
  })
  decrementUnreadKind(unreadKind)
  if (id) void markReadById(id)
  closeBrowserNotificationsForHref(itemHref(item))
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

function kindFromQuery(): NotificationKind | null {
  const q = route.query.kind
  const valid: NotificationKind[] = ['comment', 'boost', 'repost', 'follow', 'followed_post', 'followed_article', 'mention', 'nudge', 'coin_transfer', 'poll_results_ready', 'generic']
  return (typeof q === 'string' && valid.includes(q as NotificationKind)) ? (q as NotificationKind) : null
}

let lastDeliveredMarkAt = 0
function markDeliveredInBackground() {
  if (import.meta.client && document.visibilityState !== 'visible') return
  const now = Date.now()
  if (now - lastDeliveredMarkAt < 1_000) return
  lastDeliveredMarkAt = now
  void markDelivered()
  setNotificationUndeliveredCount(0)
}

onMounted(async () => {
  markDeliveredInBackground()
  await setKind(kindFromQuery())
})

onActivated(async () => {
  markDeliveredInBackground()
  const kind = kindFromQuery()
  if (kind !== activeKind.value) {
    await setKind(kind)
  } else {
    await fetchList({ forceRefresh: true })
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
    if (import.meta.client && document.visibilityState !== 'visible') return
    markDeliveredInBackground()
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
