<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div class="sticky top-0 z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
      <div class="relative z-10 flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div class="min-w-0">
          <div class="text-base sm:text-lg font-semibold">Notifications</div>
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
    </div>

    <div v-if="loading && !notifications.length" class="px-3 py-6 sm:px-4 sm:py-8 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400">
      Loading…
    </div>
    <div
      v-else-if="!notifications.length"
      class="px-3 py-6 sm:px-4 sm:py-8 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400"
    >
      No notifications yet.
    </div>
    <div v-else class="relative z-0 divide-y divide-gray-200 dark:divide-zinc-800">
      <template
        v-for="(item, idx) in notifications"
        :key="itemKey(item)"
      >
        <!--
          Use NuxtLink `custom` slot so the row renders as a <div>, not <a>.
          Without this, the inner actor-avatar NuxtLinks inside each row create
          nested <a> elements, which the browser automatically restructures and
          causes hydration mismatches.
          The div gets role="link" + keyboard handlers for full accessibility.
        -->
        <NuxtLink
          v-if="itemHref(item)"
          v-slot="{ navigate }"
          :to="itemHref(item)!"
          custom
        >
          <div
            class="block w-full text-left hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer"
            role="link"
            tabindex="0"
            @click="navigate($event)"
            @keydown.enter.prevent="navigate($event)"
            @keydown.space.prevent="navigate($event)"
          >
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
        </NuxtLink>
        <div v-else class="block w-full text-left">
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
      </template>

      <div v-if="nextCursor && !loading" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
        <Button
          label="Load more"
          text
          severity="secondary"
          :loading="loadingMore"
          @click="loadMore"
        />
      </div>
      <div v-else-if="loadingMore" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
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
  fetchList,
  markDelivered,
  markAllRead,
  itemHref,
} = useNotifications()

const notifBadge = useNotificationsBadge()
const { setNotificationUndeliveredCount, addInterest, removeInterest } = usePresence()
const loadingMore = ref(false)
const markingAllRead = ref(false)

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

async function onMarkAllRead() {
  markingAllRead.value = true
  try {
    await markAllRead()
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

onMounted(async () => {
  await markDelivered()
  setNotificationUndeliveredCount(0)
  await fetchList()
})

onActivated(async () => {
  await markDelivered()
  setNotificationUndeliveredCount(0)
  await fetchList({ forceRefresh: true })
})

onUnmounted(() => {
  notifBadge.fetchUndeliveredCount?.()
})

// Refetch list when socket says new notifications arrived (count increased).
// Use forceRefresh so we refetch even when we already have data (user is on the page).
// Only auto-mark delivered if the page is currently visible; if it's a background tab,
// skip so the badge isn't silently cleared before the user returns to the app.
const { notificationUndeliveredCount } = usePresence()
let undeliveredSeq = 0
watch(notificationUndeliveredCount, async (newVal, oldVal) => {
  if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal > oldVal) {
    if (import.meta.client && document.visibilityState !== 'visible') return
    const seq = ++undeliveredSeq
    await markDelivered()
    if (seq !== undeliveredSeq) return
    setNotificationUndeliveredCount(0)
    if (seq !== undeliveredSeq) return
    await fetchList({ forceRefresh: true })
  }
})

// No SSR fetch: notifications use a useState key derived from me.value?.id,
// which may not be resolved during client hydration, causing a state-key mismatch
// and hydration errors. The page is auth-gated so SSR data provides no SEO value.
</script>
