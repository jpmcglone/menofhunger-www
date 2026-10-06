<template>
  <section class="pb-8" aria-label="Recommendations">
    <template v-if="context?.kind === 'post'">
      <div v-if="postState && showPostSection" class="mb-2">
        <h2 class="moh-gutter-x pb-1 moh-h2">Discover more</h2>

        <div v-if="postLoadingFirst" class="animate-pulse" aria-hidden="true">
          <div v-for="i in 4" :key="i" class="flex gap-3 border-t moh-border-subtle px-4 py-3">
            <div class="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-1/3 rounded-full bg-gray-200 dark:bg-zinc-800" />
              <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-zinc-800" />
            </div>
          </div>
        </div>

        <ul v-else-if="postItems.length" class="moh-divide">
          <li v-for="item in postItems" :key="item.id">
            <AppLayoutRailPostRow :post="item" />
          </li>
        </ul>

        <div v-if="postError" class="px-4 py-3 text-sm moh-text-muted">
          <p>Couldn’t load recommendations.</p>
          <button type="button" class="mt-1 font-medium hover:underline moh-focus" @click="postState.retry()">Try again</button>
        </div>

        <div v-if="postItems.length && postState.railHasMore.value" class="px-4 pt-2">
          <button
            type="button"
            class="moh-tap moh-focus flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold moh-surface-hover"
            :disabled="postState.loading.value"
            @click="postState.showMoreInRail()"
          >
            {{ postState.loading.value ? 'Loading…' : 'Show more' }}
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="recs">
      <div v-if="recs.loading.value && !recs.loaded.value" class="animate-pulse" aria-hidden="true">
        <div class="moh-gutter-x pb-2"><div class="h-4 w-36 rounded-full bg-gray-200 dark:bg-zinc-800" /></div>
        <div v-for="i in 3" :key="i" class="space-y-1.5 border-t moh-border-subtle px-4 py-3">
          <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-zinc-800" />
          <div class="h-2.5 w-1/2 rounded-full bg-gray-200 dark:bg-zinc-800" />
        </div>
      </div>

      <div v-else-if="recs.error.value" class="px-4 py-3 text-sm moh-text-muted">
        <p>Couldn’t load recommendations.</p>
        <button type="button" class="mt-1 font-medium hover:underline moh-focus" @click="recs.retry()">Try again</button>
      </div>

      <template v-else>
        <div v-for="section in recs.sections.value" :key="section.key" class="mb-4">
          <h2 class="moh-gutter-x pb-1 moh-h2">{{ section.label }}</h2>
          <ul class="moh-divide">
            <li v-for="item in section.items" :key="item.id">
              <AppLayoutRailLinkRow :item="item" />
            </li>
          </ul>
        </div>
      </template>
    </template>

    <div v-if="showQuietLink" class="px-4 pt-2">
      <NuxtLink :to="discoveryLink.to" class="text-sm moh-text-muted hover:underline moh-focus">
        {{ discoveryLink.label }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'
import type { FeedPost, WsPostsLiveUpdatedPayload, WsArticlesLiveUpdatedPayload } from '~/types/api'
import type { RailContext } from '~/composables/useRailContext'

const { context } = useRailContext()
const { isAuthed } = useAuth()
const { load: loadBlocks, blockedIds } = useBlockState()
const presence = usePresence()

const postState = computed(() => (context.value?.kind === 'post' ? context.value.discover : null))

// Post discovery: arm once the primary post has loaded (the context is only published then).
watch(
  postState,
  (state) => { if (state && import.meta.client) state.arm() },
  { immediate: true },
)

const postItems = computed<FeedPost[]>(() => {
  const state = postState.value
  if (!state) return []
  const blocked = blockedIds.value
  return state.railPosts.value.filter((p) => !p.author?.id || !blocked.has(p.author.id))
})
const postLoadingFirst = computed(() => {
  const state = postState.value
  return Boolean(state && state.loading.value && state.posts.value.length === 0)
})
const postError = computed(() => Boolean(postState.value?.error.value))
const showPostSection = computed(() => {
  const state = postState.value
  if (!state) return false
  return !state.loaded.value || state.posts.value.length > 0 || state.loading.value || Boolean(state.error.value)
})

// Article / Board recommendations.
const recContext = computed<RailContext | null>(() => (context.value?.kind === 'post' ? null : context.value))
const recs = useRailRecommendations(recContext)

const empty = computed(() => {
  const ctx = context.value
  if (!ctx) return false
  if (ctx.kind === 'post') {
    const state = postState.value
    return Boolean(state && state.loaded.value && !state.loading.value && !state.error.value && postItems.value.length === 0)
  }
  return recs.loaded.value && !recs.loading.value && !recs.error.value && recs.sections.value.length === 0
})
const showQuietLink = computed(() => empty.value)

const discoveryLink = computed(() => {
  switch (context.value?.kind) {
    case 'article': return { to: '/articles', label: 'Browse articles' }
    case 'board': return { to: '/b', label: 'Browse the Board' }
    default: return { to: '/explore', label: 'Explore' }
  }
})

// Realtime: drop deleted content in place. Mutable lists refetch only through identity changes.
const subscribedPosts = ref<string[]>([])
const subscribedArticles = ref<string[]>([])

const postsCb = {
  onLiveUpdated: (payload: WsPostsLiveUpdatedPayload) => {
    const ctx = context.value
    if (!ctx) return
    if (ctx.kind === 'post') {
      if (payload.patch.deletedAt) ctx.discover.removePost(payload.postId)
      else {
        const { commentCount, boostCount } = payload.patch
        const patch: Partial<FeedPost> = {}
        if (typeof commentCount === 'number') patch.commentCount = commentCount
        if (typeof boostCount === 'number') patch.boostCount = boostCount
        if (Object.keys(patch).length) ctx.discover.patchPost(payload.postId, patch)
      }
      return
    }
    if (ctx.kind === 'board' && payload.patch.deletedAt) recs.removeItem(payload.postId)
  },
}
const articlesCb = {
  onLiveUpdated: (payload: WsArticlesLiveUpdatedPayload) => {
    if (context.value?.kind === 'article' && payload.patch.deletedAt) recs.removeItem(payload.articleId)
  },
}

const wantedPostIds = computed<string[]>(() => {
  const ctx = context.value
  if (!ctx) return []
  if (ctx.kind === 'post') return ctx.discover.railPosts.value.map((p) => p.id)
  if (ctx.kind === 'board') return recs.itemIds.value
  return []
})
const wantedArticleIds = computed<string[]>(() => (context.value?.kind === 'article' ? recs.itemIds.value : []))

function syncSubscriptions(wanted: string[], current: Ref<string[]>, sub: (ids: string[]) => void, unsub: (ids: string[]) => void) {
  const next = new Set(wanted)
  const prev = new Set(current.value)
  const drop = current.value.filter((id) => !next.has(id))
  const add = wanted.filter((id) => !prev.has(id))
  if (drop.length) unsub(drop)
  if (add.length) sub(add)
  current.value = [...next]
}

onMounted(() => {
  presence.addPostsCallback(postsCb as never)
  presence.addArticlesCallback(articlesCb as never)
  if (isAuthed.value) void loadBlocks()
  watch(
    wantedPostIds,
    (ids) => syncSubscriptions(ids, subscribedPosts, presence.subscribePosts, presence.unsubscribePosts),
    { immediate: true },
  )
  watch(
    wantedArticleIds,
    (ids) => syncSubscriptions(ids, subscribedArticles, presence.subscribeArticles, presence.unsubscribeArticles),
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  presence.removePostsCallback(postsCb as never)
  presence.removeArticlesCallback(articlesCb as never)
  if (subscribedPosts.value.length) presence.unsubscribePosts(subscribedPosts.value)
  if (subscribedArticles.value.length) presence.unsubscribeArticles(subscribedArticles.value)
  subscribedPosts.value = []
  subscribedArticles.value = []
})
</script>
