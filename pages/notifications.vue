<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div class="sticky top-0 z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
      <div class="relative z-10 flex items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <div class="text-lg font-semibold">Notifications</div>
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

    <div v-if="loading && !notifications.length" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
      Loading…
    </div>
    <div
      v-else-if="!notifications.length"
      class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      No notifications yet.
    </div>
    <div v-else class="relative z-0 divide-y divide-gray-200 dark:divide-zinc-800">
      <template v-for="item in notifications" :key="item.type === 'single' ? item.notification.id : item.group.id">
        <NuxtLink
          v-if="itemHref(item)"
          :to="itemHref(item)!"
          :prefetch="false"
          class="block w-full text-left hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer"
        >
          <AppNotificationRow v-if="item.type === 'single'" :notification="item.notification" />
          <AppNotificationGroupRow v-else :group="item.group" />
        </NuxtLink>
        <div v-else class="block w-full text-left">
          <AppNotificationRow v-if="item.type === 'single'" :notification="item.notification" />
          <AppNotificationGroupRow v-else :group="item.group" />
        </div>
      </template>

      <div v-if="nextCursor && !loading" class="px-4 pt-3 pb-0 sm:pb-3 text-center">
        <Button
          label="Load more"
          text
          severity="secondary"
          :loading="loadingMore"
          @click="loadMore"
        />
      </div>
      <div v-else-if="loadingMore" class="px-4 pt-3 pb-0 sm:pb-3 text-center text-sm text-gray-500 dark:text-gray-400">
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
const nuxtApp = useNuxtApp()

// Presence: subscribe to notification actors so avatars show online/offline (works after hard refresh).
const notificationActorIds = computed(() => {
  const ids = new Set<string>()
  for (const item of notifications.value) {
    if (item.type === 'single') {
      const id = item.notification.actor?.id
      if (id) ids.add(id)
      continue
    }
    for (const a of item.group.actors ?? []) {
      const id = a?.id
      if (id) ids.add(id)
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
      return { ...item, group: { ...item.group, readAt: now } }
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
  // If this is the initial SSR hydration and we already have the list, avoid a duplicate fetch.
  if (!(nuxtApp.isHydrating && (notifications.value.length > 0 || loading.value))) {
    await fetchList()
  }
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
const { notificationUndeliveredCount } = usePresence()
watch(notificationUndeliveredCount, async (newVal, oldVal) => {
  if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal > oldVal) {
    await markDelivered()
    setNotificationUndeliveredCount(0)
    await fetchList({ forceRefresh: true })
  }
})

// SSR: fetch initial list so the first HTML paint includes real content (reduces flicker).
if (import.meta.server) {
  await fetchList()
}
</script>
