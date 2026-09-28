<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=951-866 -->
<template>
  <section aria-label="Unread Board activity" :aria-busy="loading">
    <div class="flex min-h-[58px] items-center justify-between gap-3 moh-gutter-x">
      <p class="text-[13px] moh-text-muted" aria-live="polite">{{ unreadCount }} unread {{ unreadCount === 1 ? 'update' : 'updates' }}</p>
      <button
        v-if="items.length || unreadCount"
        type="button"
        class="moh-focus min-h-11 text-[13px] text-[var(--moh-brass)] disabled:opacity-50"
        :disabled="markingRead"
        aria-label="Mark all Board activity read"
        @click="markAllRead"
      >{{ markingRead ? 'Marking read…' : 'Mark all read' }}</button>
    </div>
    <div v-if="error" class="moh-gutter-x py-4 text-center" role="alert">
      <p class="text-sm moh-text-muted">{{ error }}</p>
      <button type="button" class="moh-focus min-h-11 text-sm text-[var(--moh-brass)]" @click="load()">Retry</button>
    </div>
    <AppSubtleSectionLoader :loading="loading && !items.length" :refreshing="loading && !!items.length" min-height-class="min-h-[160px]">
      <div v-if="!items.length && !error && !loading" class="moh-gutter-x py-8 text-center">
        <h2 class="text-[15px] font-semibold moh-text">You're all caught up</h2>
        <p class="mt-2 text-sm moh-text-muted">New replies, mentions and updates to your Board discussions will appear here.</p>
      </div>
      <div class="moh-divide">
        <article v-for="item in items" :key="boardActivityKey(item)" class="relative bg-[var(--moh-surface)] hover:bg-[var(--moh-surface-hover)]">
          <NuxtLink :to="boardActivityHref(item)!" class="moh-focus absolute inset-0 z-[1]" :aria-label="activityLabel(item)" />
          <div class="pointer-events-none relative z-[2] [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            <AppNotificationRow v-if="item.type === 'single'" :notification="item.notification" />
            <AppNotificationGroupRow v-else-if="item.type === 'group'" :group="item.group" />
          </div>
        </article>
      </div>
      <button
        v-if="nextCursor"
        type="button"
        class="moh-focus min-h-11 w-full border-t moh-border text-sm moh-text-muted"
        :disabled="loading"
        @click="load(false)"
      >More activity</button>
    </AppSubtleSectionLoader>
  </section>
</template>

<script setup lang="ts">
import type { NotificationFeedItem } from '~/types/api'
import { boardActivityHref, boardActivityKey, useBoardActivity } from '~/composables/useBoardActivity'

const { items, nextCursor, loading, markingRead, error, load, markAllRead } = useBoardActivity()
const { notificationNavUnread } = usePresence()
const unreadCount = computed(() => notificationNavUnread.value.board)

function activityLabel(item: NotificationFeedItem): string {
  if (item.type === 'single') {
    const n = item.notification
    return `Unread Board activity: ${n.actor?.name || n.actor?.username || ''} ${n.title || n.kind}. ${n.body || n.subjectPostPreview?.bodySnippet || ''}`.trim()
  }
  if (item.type === 'group') return `Unread Board activity: ${item.group.actorCount} members, ${item.group.kind}. ${item.group.latestBody || ''}`
  return 'Open Board activity'
}
</script>
