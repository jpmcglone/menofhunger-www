<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4579 -->
<template>
  <div>
    <div class="moh-gutter-x py-3 border-b moh-border">
      <AppTabSelector
        :model-value="mode"
        aria-label="Board activity"
        :tabs="[{ key: 'threads', label: 'Posts' }, { key: 'comments', label: 'Comments' }]"
        @update:model-value="mode = $event as 'threads' | 'comments'"
      />
    </div>

    <AppSubtleSectionLoader :loading="initialLoading" :refreshing="refreshing" min-height-class="min-h-[220px]">
      <TransitionGroup v-if="mode === 'threads'" tag="div" name="moh-list" class="relative moh-divide">
        <AppBoardThreadRow v-for="t in threads" :key="t.id" :thread="t" />
      </TransitionGroup>
      <div v-else class="moh-divide">
        <article v-for="c in comments" :key="c.id" class="moh-gutter-x py-3">
          <div class="flex flex-wrap items-center gap-x-1.5 text-xs moh-text-soft">
            <AppBoardBoostButton :post-id="c.id" :points="c.points" :viewer-has-boosted="c.viewerHasBoosted" />
            <NuxtLink :to="boardCommentHref(c.threadId, c.id)" class="hover:underline">{{ formatListTime(c.createdAt) }}</NuxtLink>
            <span aria-hidden="true">·</span>
            <span>on:</span>
            <NuxtLink v-if="c.thread" :to="boardThreadHref({ id: c.threadId })" class="truncate hover:underline" style="color: var(--moh-verified)">{{ c.thread.title }}</NuxtLink>
          </div>
          <p class="mt-1 whitespace-pre-wrap break-words text-sm moh-text">{{ c.body }}</p>
        </article>
      </div>

      <p v-if="loadedKey === viewKey && isEmpty" class="py-12 text-center moh-meta">
        {{ mode === 'threads' ? 'No Board posts yet.' : 'No Board comments yet.' }}
      </p>
      <div v-if="loadingMore" class="py-8 text-center moh-meta">Loading…</div>
      <button
        v-else-if="nextCursor && !loading"
        type="button"
        class="w-full border-t moh-border py-3 text-sm moh-text-muted transition-colors hover:bg-[var(--moh-surface-hover)]"
        @click="load(false)"
      >Load more</button>
    </AppSubtleSectionLoader>
  </div>
</template>

<script setup lang="ts">
import type { BoardComment, BoardThread } from '~/types/api'
import { formatListTime } from '~/utils/time-format'

const props = defineProps<{ username: string }>()

const api = useBoardApi()
const mode = ref<'threads' | 'comments'>('threads')
const threads = ref<BoardThread[]>([])
const comments = ref<BoardComment[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
/** Which list (mode + member) the rows on screen belong to; a switch shows the loader, not a stale or empty list. */
const loadedKey = ref<string | null>(null)
const viewKey = computed(() => `${mode.value}:${props.username}`)
const initialLoading = computed(() => loadedKey.value !== viewKey.value)
const refreshing = computed(() => loading.value && !initialLoading.value)
let seq = 0

const isEmpty = computed(() => (mode.value === 'threads' ? threads.value.length === 0 : comments.value.length === 0))

async function load(reset = true) {
  const current = ++seq
  const key = viewKey.value
  if (reset) loading.value = true
  else loadingMore.value = true
  try {
    if (mode.value === 'threads') {
      const res = await api.listThreads({ sort: 'new', author: props.username, cursor: reset ? null : nextCursor.value })
      if (current !== seq) return
      threads.value = reset ? res.threads : [...threads.value, ...res.threads]
      nextCursor.value = res.nextCursor
    } else {
      const res = await api.listLatestComments({ author: props.username, cursor: reset ? null : nextCursor.value })
      if (current !== seq) return
      comments.value = reset ? res.comments : [...comments.value, ...res.comments]
      nextCursor.value = res.nextCursor
    }
    loadedKey.value = key
  } catch {
    if (current === seq) {
      nextCursor.value = null
      loadedKey.value = key
    }
  } finally {
    if (current === seq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

watch([mode, () => props.username], () => { void load(true) })
onMounted(() => { void load(true) })
</script>
