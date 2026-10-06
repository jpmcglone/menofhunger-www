<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=951-866 -->
<template>
  <section aria-label="Unread Board activity" :aria-busy="loading">
    <div v-if="error" class="moh-gutter-x py-4 text-center" role="alert">
      <p class="text-sm moh-text-muted">{{ error }}</p>
      <button type="button" class="moh-focus min-h-11 text-sm text-[var(--moh-brass)]" @click="load()">Retry</button>
    </div>
    <AppSubtleSectionLoader :loading="loading && !items.length" :refreshing="loading && !!items.length" min-height-class="min-h-[160px]">
      <div v-if="!items.length && !error && !loading" class="moh-gutter-x py-8 text-center">
        <h2 class="text-[15px] font-semibold moh-text">You're all caught up</h2>
        <p class="mt-2 text-sm moh-text-muted">Replies, mentions and comments on your discussions will appear here.</p>
      </div>
      <div class="moh-divide">
        <NuxtLink v-for="item in items" :key="boardActivityKey(item)" :to="boardActivityHref(item)!" class="moh-focus flex min-h-11 gap-3 moh-gutter-x py-4 hover:bg-[var(--moh-surface-hover)]">
          <span class="mt-1.5 size-1.5 shrink-0 rounded-full " :class="activityBadgeTone" aria-label="Unread activity" />
          <div class="min-w-0">
            <p class="text-[15px] font-semibold moh-text">{{ presentation(item).title }}</p>
            <p class="mt-1 text-xs moh-text-muted">{{ presentation(item).actor }} <span :style="{ color: activityColor }">{{ presentation(item).activity }}</span></p>
            <p v-if="presentation(item).body" class="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm moh-text-muted">{{ presentation(item).body }}</p>
          </div>
        </NuxtLink>
      </div>
      <button
        v-if="nextCursor"
        type="button"
        class="moh-focus min-h-11 w-full border-t moh-border text-sm moh-text-muted"
        :disabled="loading"
        @click="load(false)"
      >More comments</button>
    </AppSubtleSectionLoader>
  </section>
</template>

<script setup lang="ts">
import { userActionColor } from '~/utils/user-tier'
const activityViewer = useAuth()
const activityColor = computed(() => userActionColor(activityViewer.user.value))
const activityBadgeTone = useActivityBadgeTone()
import type { NotificationFeedItem } from '~/types/api'
import { boardActivityHref, boardActivityKey } from '~/composables/useBoardActivity'

defineProps<{
  items: NotificationFeedItem[]
  nextCursor: string | null
  loading: boolean
  error: string | null
  load: (reset?: boolean) => Promise<void>
}>()

function presentation(item: NotificationFeedItem) {
  if (item.type === 'single') {
    const n = item.notification
    return {
      title: n.post?.boardThreadTitle || n.post?.board?.title || 'Board discussion',
      actor: n.actor?.username || n.actor?.name || 'A member',
      activity: n.kind === 'mention' ? 'mentioned you' : n.kind === 'comment' ? 'replied to you' : 'commented',
      body: n.post?.body || n.body || n.subjectPostPreview?.bodySnippet,
    }
  }
  return {
    title: 'Board discussion', actor: item.type === 'group' ? `${item.group.actorCount} members` : '',
    activity: 'commented', body: item.type === 'group' ? item.group.latestBody : '',
  }
}
</script>
