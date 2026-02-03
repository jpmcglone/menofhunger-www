<template>
  <div class="-mx-4">
    <div class="flex justify-end px-4 py-2">
      <Button
        v-if="notifications.length > 0"
        label="Mark all as read"
        text
        severity="secondary"
        :disabled="loading || markingAllRead"
        @click="onMarkAllRead"
      />
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
    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
      <template v-for="n in notifications" :key="n.id">
        <NuxtLink
          v-if="rowHref(n)"
          :to="rowHref(n)!"
          class="block w-full text-left"
        >
          <div
          :class="[
            'flex gap-3 px-4 py-3 transition-colors',
            rowHref(n) ? 'hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer' : '',
            subjectTierRowClass(n)
          ]"
        >
          <div class="mt-1 flex shrink-0 items-start">
            <span
              :class="[
                'mt-2 h-2 w-2 rounded-full shrink-0',
                n.readAt ? 'bg-gray-300 dark:bg-zinc-700' : 'bg-blue-500'
              ]"
              aria-hidden="true"
            />
          </div>

          <div class="flex min-w-0 flex-1 items-start gap-3">
            <div class="shrink-0" @click.stop>
              <NuxtLink
                v-if="n.actor?.id"
                :to="n.actor.username ? `/u/${n.actor.username}` : `/u/id/${n.actor.id}`"
                class="block"
                @click.stop
              >
                <AppUserAvatar
                  :user="{
                    id: n.actor.id,
                    username: n.actor.username,
                    name: n.actor.name,
                    avatarUrl: n.actor.avatarUrl,
                  }"
                  size-class="h-10 w-10"
                />
              </NuxtLink>
              <div
                v-else
                class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800"
                aria-hidden="true"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div :class="['truncate', n.readAt ? 'font-medium' : 'font-semibold']">
                    <span :class="actorTierClass(n)">{{ actorDisplay(n) }}</span> {{ titleSuffix(n) }}
                  </div>
                  <div
                    v-if="n.body && !n.subjectPostPreview"
                    class="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-300"
                  >
                    {{ n.body }}
                  </div>
                </div>
                <div class="flex shrink-0 items-start gap-2">
                  <div
                    v-if="n.subjectPostPreview && (n.subjectPostPreview.bodySnippet || n.subjectPostPreview.media?.length)"
                    class="flex flex-col items-end gap-1 text-right"
                  >
                    <blockquote
                      v-if="n.subjectPostPreview.bodySnippet"
                      class="max-w-[140px] truncate border-l-2 border-gray-300 pl-1.5 text-[11px] italic text-gray-500 dark:border-zinc-600 dark:text-gray-400"
                    >
                      {{ n.subjectPostPreview.bodySnippet }}
                    </blockquote>
                    <div
                      v-if="n.subjectPostPreview.media?.length"
                      class="flex -space-x-2"
                    >
                      <template
                        v-for="(m, idx) in n.subjectPostPreview.media.slice(0, 4)"
                        :key="idx"
                      >
                        <img
                          v-if="(m.kind === 'video' ? m.thumbnailUrl : m.url)"
                          :src="m.kind === 'video' ? (m.thumbnailUrl || m.url) : m.url"
                          :alt="''"
                          class="h-8 w-8 shrink-0 rounded border border-gray-200 object-cover dark:border-zinc-700"
                          loading="lazy"
                        >
                      </template>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatWhen(n.createdAt) }}
                  </div>
                </div>
              </div>
              <div v-if="!n.body && !n.subjectPostPreview" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ notificationContext(n) }}
              </div>
            </div>
          </div>
        </div>
        </NuxtLink>
        <div
          v-else
          class="block w-full text-left"
        >
          <div
          :class="[
            'flex gap-3 px-4 py-3 transition-colors',
            subjectTierRowClass(n)
          ]"
        >
          <div class="mt-1 flex shrink-0 items-start">
            <span
              :class="[
                'mt-2 h-2 w-2 rounded-full shrink-0',
                n.readAt ? 'bg-gray-300 dark:bg-zinc-700' : 'bg-blue-500'
              ]"
              aria-hidden="true"
            />
          </div>

          <div class="flex min-w-0 flex-1 items-start gap-3">
            <div class="shrink-0" @click.stop>
              <NuxtLink
                v-if="n.actor?.id"
                :to="n.actor.username ? `/u/${n.actor.username}` : `/u/id/${n.actor.id}`"
                class="block"
                @click.stop
              >
                <AppUserAvatar
                  :user="{
                    id: n.actor.id,
                    username: n.actor.username,
                    name: n.actor.name,
                    avatarUrl: n.actor.avatarUrl,
                  }"
                  size-class="h-10 w-10"
                />
              </NuxtLink>
              <div
                v-else
                class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800"
                aria-hidden="true"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div :class="['truncate', n.readAt ? 'font-medium' : 'font-semibold']">
                    <span :class="actorTierClass(n)">{{ actorDisplay(n) }}</span> {{ titleSuffix(n) }}
                  </div>
                  <div
                    v-if="n.body && !n.subjectPostPreview"
                    class="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-300"
                  >
                    {{ n.body }}
                  </div>
                </div>
                <div class="flex shrink-0 items-start gap-2">
                  <div
                    v-if="n.subjectPostPreview && (n.subjectPostPreview.bodySnippet || n.subjectPostPreview.media?.length)"
                    class="flex flex-col items-end gap-1 text-right"
                  >
                    <blockquote
                      v-if="n.subjectPostPreview.bodySnippet"
                      class="max-w-[140px] truncate border-l-2 border-gray-300 pl-1.5 text-[11px] italic text-gray-500 dark:border-zinc-600 dark:text-gray-400"
                    >
                      {{ n.subjectPostPreview.bodySnippet }}
                    </blockquote>
                    <div
                      v-if="n.subjectPostPreview.media?.length"
                      class="flex -space-x-2"
                    >
                      <template
                        v-for="(m, idx) in n.subjectPostPreview.media.slice(0, 4)"
                        :key="idx"
                      >
                        <img
                          v-if="(m.kind === 'video' ? m.thumbnailUrl : m.url)"
                          :src="m.kind === 'video' ? (m.thumbnailUrl || m.url) : m.url"
                          :alt="''"
                          class="h-8 w-8 shrink-0 rounded border border-gray-200 object-cover dark:border-zinc-700"
                          loading="lazy"
                        >
                      </template>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatWhen(n.createdAt) }}
                  </div>
                </div>
              </div>
              <div v-if="!n.body && !n.subjectPostPreview" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ notificationContext(n) }}
              </div>
            </div>
          </div>
        </div>
        </div>
      </template>

      <div v-if="nextCursor && !loading" class="px-4 py-3 text-center">
        <Button
          label="Load more"
          text
          severity="secondary"
          :loading="loadingMore"
          @click="loadMore"
        />
      </div>
      <div v-else-if="loadingMore" class="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Notifications'
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
  actorDisplay,
  actorTierClass,
  subjectTierRowClass,
  titleSuffix,
  notificationContext,
  formatWhen,
  rowHref,
} = useNotifications()

const notifBadge = useNotificationsBadge()
const { setNotificationUndeliveredCount, addInterest, removeInterest } = usePresence()
const loadingMore = ref(false)
const markingAllRead = ref(false)

// Presence: subscribe to notification actors so avatars show online/offline (works after hard refresh).
const notificationActorIds = computed(() => {
  const ids = new Set<string>()
  for (const n of notifications.value) {
    const id = n.actor?.id
    if (id) ids.add(id)
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
    notifications.value = notifications.value.map((n) => ({ ...n, readAt: new Date().toISOString() }))
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
  await notifBadge.fetchUnreadCount?.()
  await fetchList()
})

onUnmounted(() => {
  notifBadge.fetchUnreadCount?.()
})

// Refetch list when socket says new notifications arrived (count increased)
const { notificationUndeliveredCount } = usePresence()
watch(notificationUndeliveredCount, (newVal, oldVal) => {
  if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal > oldVal) {
    fetchList()
  }
})
</script>
