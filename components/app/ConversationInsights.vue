<template>
  <section v-if="postId || data?.posts.length || error" class="border-b moh-border">
    <button type="button" class="moh-gutter-x flex min-h-12 w-full items-center gap-3 py-3 text-left" :aria-expanded="open" @click="open = !open">
      <Icon name="tabler:chart-bar" class="text-lg moh-text-muted" aria-hidden="true" />
      <span class="flex-1 text-sm font-medium">{{ postId ? 'Post activity' : 'Your week' }}</span>
      <span v-if="data" class="flex items-center gap-3 text-xs moh-text-muted tabular-nums">
        <span v-if="!postId" :aria-label="`${data.postCount} new posts`"><Icon name="tabler:pencil" aria-hidden="true" /> {{ data.postCount }}</span>
        <span :aria-label="`${data.participantCount} participants`"><Icon name="tabler:users" aria-hidden="true" /> {{ data.participantCount }}</span>
      </span>
      <Icon :name="open ? 'tabler:chevron-up' : 'tabler:chevron-down'" class="text-sm moh-text-muted" aria-hidden="true" />
    </button>
    <div v-if="open" class="moh-gutter-x pb-4">
      <p v-if="error" class="text-sm moh-text-muted">{{ error }} <button type="button" class="underline" @click="load">Retry</button></p>
      <div v-else-if="!data" class="h-24 animate-pulse rounded-lg moh-surface-2" aria-label="Loading activity" />
      <template v-else>
        <div class="mb-4 flex items-baseline gap-2">
          <span class="text-3xl font-semibold tabular-nums tracking-tight">{{ data.participantCount }}</span>
          <span class="text-sm moh-text-muted">{{ data.participantCount === 1 ? 'participant' : 'participants' }}</span>
          <span v-if="data.newParticipantCount" class="ml-auto rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-600 dark:text-sky-400">{{ data.newParticipantCount }} new</span>
        </div>
        <p class="mb-2 text-[11px] moh-text-muted">{{ postId ? 'Last 30 days' : 'Last 7 days' }}</p>
        <AppConversationChart :days="data.timeline" />
        <div class="mt-4 space-y-4">
          <article v-for="item in visiblePosts" :key="item.id" class="border-t moh-border pt-3">
            <NuxtLink v-if="!postId" :to="`/p/${item.id}?insights=1`" class="block text-sm font-medium hover:underline">
              <span v-if="item.renewed" class="mb-1 block text-[10px] font-normal moh-text-muted">Active again</span>
              <span class="line-clamp-2">{{ item.body || 'View post' }}</span>
            </NuxtLink>
            <div v-if="item.participants.length" class="my-2 flex items-center gap-2">
              <div class="flex -space-x-2">
                <NuxtLink v-for="person in item.participants" :key="person.id" :to="`/u/${encodeURIComponent(person.username ?? '')}`" :aria-label="person.name || person.username || 'Member'" class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 moh-border moh-surface text-[10px]">
                  <img v-if="person.avatarUrl" :src="person.avatarUrl" alt="" class="h-full w-full object-cover" loading="lazy">
                  <span v-else>{{ (person.name || person.username || '?').slice(0, 1) }}</span>
                </NuxtLink>
              </div>
              <span v-if="item.participantCount > 6" class="text-xs moh-text-muted">+{{ item.participantCount - 6 }}</span>
            </div>
            <NuxtLink v-for="reply in item.replies.slice(postId ? 0 : -1)" :key="reply.id" :to="`/p/${reply.id}`" class="mt-2 block border-l-2 border-sky-500/30 pl-3 text-xs hover:border-sky-500">
              <span class="font-medium">{{ reply.author.name || reply.author.username }}</span>
              <span class="mt-1 line-clamp-2 moh-text-muted">{{ reply.body || 'View reply' }}</span>
            </NuxtLink>
          </article>
        </div>
        <button v-if="!postId && data.posts.length > 3" type="button" class="mt-3 text-xs moh-text-muted underline" @click="showAll = !showAll">{{ showAll ? 'Show less' : `All ${data.posts.length} posts` }}</button>
        <button v-if="!postId && data.postCount > 0" type="button" class="mt-4 flex items-center gap-1 text-xs moh-text-muted" @click="share"><Icon name="tabler:share" aria-hidden="true" />{{ copied ? 'Copied' : 'Share recap' }}</button>
      </template>
    </div>
  </section>
</template>
<script setup lang="ts">
import type { ConversationInsights } from '~/types/api'
import type { PostsCallback } from '~/composables/usePresence'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ postId?: string }>()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const route = useRoute()
const open = ref(Boolean(props.postId && route.query.insights === '1'))
const data = ref<ConversationInsights | null>(null)
const error = ref('')
const showAll = ref(false)
const copied = ref(false)
const visiblePosts = computed(() => data.value?.posts.slice(0, props.postId || showAll.value ? undefined : 3) ?? [])
let request = 0
let disposed = false
let active = false
let loadingRequest = 0
let refreshPending = false
async function load() {
  if (!user.value?.id || disposed || !active) return
  if (loadingRequest) { refreshPending = true; return }
  if (timer) clearTimeout(timer)
  timer = undefined
  refreshPending = false
  const current = ++request
  loadingRequest = current
  try {
    const result = await apiFetchData<ConversationInsights>(props.postId ? `/posts/${encodeURIComponent(props.postId)}/insights` : '/posts/insights/weekly')
    if (current !== request || disposed) return
    data.value = result
    error.value = ''
  } catch (e) { if (current === request && !disposed) error.value = getSafeUserErrorMessage(e, 'Could not load activity.') }
  finally {
    if (loadingRequest === current) {
      loadingRequest = 0
      if (refreshPending) refreshSoon()
    }
  }
}
async function share() {
  if (!data.value) return
  const text = `My week on Men of Hunger: ${data.value.postCount} posts, ${data.value.participantCount} conversation participants.`
  try {
    if (navigator.share) await navigator.share({ text })
    else { await navigator.clipboard.writeText(text); copied.value = true }
  } catch { /* Dismissed share sheet. */ }
}
const presence = usePresence()
let timer: ReturnType<typeof setTimeout> | undefined
function refreshSoon() {
  if (!active) return
  refreshPending = true
  if (loadingRequest || timer) return
  timer = setTimeout(() => { timer = undefined; void load() }, 1500)
}
function includesPost(id: string) {
  return props.postId ? id === props.postId : data.value?.posts.some(post => post.id === id) === true
}
const callback: PostsCallback = {
  onLiveUpdated: payload => {
    if (includesPost(payload.postId) && ['commentCount', 'repostCount', 'deletedAt', 'body'].some(key => key in payload.patch)) refreshSoon()
  },
  onCommentAdded: payload => {
    if (includesPost(payload.parentPostId)) refreshSoon()
  },
  onCommentDeleted: payload => { if (includesPost(payload.parentPostId)) refreshSoon() },
  onFeedNewPost: payload => { if (!props.postId && payload.post.author.id === user.value?.id) refreshSoon() },
}
const subscribed = ref<string[]>([])
watch(() => data.value?.posts.map(p => p.id) ?? [], ids => {
  presence.unsubscribePosts(subscribed.value)
  subscribed.value = active ? ids : []
  presence.subscribePosts(subscribed.value)
})
watch(() => [user.value?.id, props.postId], () => {
  request++
  loadingRequest = 0
  refreshPending = false
  if (timer) clearTimeout(timer)
  timer = undefined
  data.value = null
  error.value = ''
  showAll.value = false
  copied.value = false
  void load()
})
const userCallback = { onMeUpdated: refreshSoon }
function activate() {
  if (active || disposed) return
  active = true
  presence.addPostsCallback(callback)
  presence.addUsersCallback(userCallback)
  subscribed.value = data.value?.posts.map(post => post.id) ?? []
  presence.subscribePosts(subscribed.value)
  void load()
}
function deactivate() {
  active = false
  request++
  loadingRequest = 0
  refreshPending = false
  if (timer) clearTimeout(timer)
  timer = undefined
  presence.removePostsCallback(callback)
  presence.removeUsersCallback(userCallback)
  presence.unsubscribePosts(subscribed.value)
  subscribed.value = []
}
onMounted(activate)
onActivated(activate)
onDeactivated(deactivate)
onBeforeUnmount(() => { disposed = true; deactivate() })
watch(open, value => { if (value) void load() })
</script>
