<template>
  <section v-if="postId || data?.posts.length || error || open" class="border-b moh-border">
    <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 155:21 -->
    <button v-if="!postId" type="button" class="moh-gutter-x moh-focus moh-surface-hover flex min-h-[72px] w-full items-center gap-3 py-3 text-left" aria-haspopup="dialog" @click="open = true">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] moh-surface-2 moh-text-muted">
        <AppIconGlyph name="analytics" :size="20" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold">Your week</span>
        <span class="mt-1 block text-xs moh-text-muted tabular-nums">{{ weeklySummary }}</span>
      </span>
      <span class="shrink-0 text-xs font-semibold moh-text-muted">View</span>
    </button>
    <button v-else type="button" class="moh-gutter-x flex min-h-12 w-full items-center gap-3 py-3 text-left" :aria-expanded="open" @click="open = !open">
      <Icon name="tabler:chart-bar" class="text-lg moh-text-muted" aria-hidden="true" />
      <span class="flex-1 text-sm font-medium">Post activity</span>
      <span v-if="data" class="flex items-center gap-3 text-xs moh-text-muted tabular-nums">
        <span :aria-label="`${data.participantCount} participants`"><Icon name="tabler:users" aria-hidden="true" /> {{ data.participantCount }}</span>
      </span>
      <Icon :name="open ? 'tabler:chevron-up' : 'tabler:chevron-down'" class="text-sm moh-text-muted" aria-hidden="true" />
    </button>
    <component
      :is="postId ? 'div' : Dialog"
      v-if="open || !postId"
      v-bind="postId ? {} : { visible: open, modal: true, header: 'Your week', draggable: false, dismissableMask: true, closeOnEscape: false, style: { width: 'min(35rem, calc(100vw - 2rem))', maxHeight: '90dvh' } }"
      :class="postId ? 'moh-gutter-x pb-4' : undefined"
      @update:visible="open = $event"
    >
      <div v-if="open">
        <p v-if="error" class="text-sm moh-text-muted">{{ error }} <button type="button" class="underline" @click="load">Retry</button></p>
        <div v-else-if="!data" class="h-24 animate-pulse rounded-lg moh-surface-2" aria-label="Loading activity" />
        <template v-else>
          <p v-if="!postId" class="mb-4 text-xs moh-text-muted">Last 7 days · {{ data.postCount }} {{ data.postCount === 1 ? 'post' : 'posts' }}</p>
          <div class="mb-4 flex items-baseline gap-2">
            <span class="text-3xl font-semibold tabular-nums tracking-tight">{{ data.participantCount }}</span>
            <span class="text-sm moh-text-muted">{{ data.participantCount === 1 ? 'participant' : 'participants' }}</span>
            <span v-if="data.newParticipantCount" class="ml-auto rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-600 dark:text-sky-400">{{ data.newParticipantCount }} new</span>
          </div>
          <p v-if="postId" class="mb-2 text-[11px] moh-text-muted">Last 30 days</p>
          <AppConversationChart :days="data.timeline" />
          <p v-if="!postId && !data.posts.length" class="mt-4 text-sm moh-text-muted">No conversation activity in the last 7 days.</p>
          <h3 v-else-if="!postId" class="mt-5 text-sm font-semibold">Conversations</h3>
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
          <button v-if="!postId && data.posts.length > 3" type="button" class="mt-3 min-h-11 text-xs moh-text-muted underline" @click="showAll = !showAll">{{ showAll ? 'Show less' : `All ${data.posts.length} posts` }}</button>
          <button v-if="!postId && data.postCount > 0" type="button" class="mt-4 flex min-h-11 items-center gap-2 text-sm font-medium moh-text-muted" @click="share"><Icon name="tabler:share" aria-hidden="true" />{{ copied ? 'Copied' : 'Share recap' }}</button>
        </template>
      </div>
    </component>
  </section>
</template>
<script setup lang="ts">
import Dialog from 'primevue/dialog'
import type { ConversationInsights } from '~/types/api'
import type { PostsCallback } from '~/composables/usePresence'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ postId?: string }>()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const route = useRoute()
const open = ref(Boolean(props.postId && route.query.insights === '1'))
const data = ref<ConversationInsights | null>(null)
const weeklySummary = computed(() => {
  if (error.value) return 'Activity unavailable'
  if (!data.value) return 'Last 7 days'
  const { postCount, participantCount } = data.value
  return `${postCount} ${postCount === 1 ? 'post' : 'posts'} · ${participantCount} ${participantCount === 1 ? 'participant' : 'participants'}`
})
useOverlayDismiss(computed(() => !props.postId && open.value), () => { open.value = false })
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
  open.value = Boolean(props.postId && route.query.insights === '1')
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
  if (!props.postId) open.value = false
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
