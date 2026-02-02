<template>
  <div class="mt-3 pr-12">
    <div
      class="overflow-hidden rounded-xl border moh-border transition-colors moh-surface-hover"
      role="group"
      aria-label="Embedded post preview"
      :aria-busy="showSkeleton ? 'true' : 'false'"
      @click.stop="goToPost"
    >
      <div class="p-3 min-h-[96px]">
        <div v-if="showSkeleton" class="flex gap-3">
          <div class="h-9 w-9 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <div class="h-4 w-40 max-w-[60%] rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
              <div class="h-3 w-10 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
            </div>
            <div class="h-3 w-64 max-w-[85%] rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
            <!-- Reserve space for media to avoid layout shift -->
            <div class="mt-2 h-20 w-full rounded-lg bg-gray-200 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
          </div>
        </div>

        <div v-else-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</div>

        <div v-else-if="post" class="flex gap-3">
          <AppUserAvatar
            :user="post.author"
            size-class="h-9 w-9"
            bg-class="moh-surface"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-1.5 flex-nowrap">
                  <span class="text-sm font-semibold moh-text truncate">
                    {{ post.author.name || post.author.username || 'User' }}
                  </span>
                  <AppVerifiedBadge
                    class="shrink-0"
                    :status="post.author.verifiedStatus ?? 'none'"
                    :premium="post.author.premium ?? false"
                  />
                </div>
                <div class="text-[11px] moh-text-muted truncate">@{{ post.author.username || 'user' }}</div>
              </div>
              <div class="text-[11px] moh-text-muted shrink-0">
                {{ createdAtShort }}
              </div>
            </div>

            <div class="mt-2 text-sm moh-text whitespace-pre-wrap break-words">
              {{ bodyPreview }}
            </div>

            <!-- Compact media preview (up to 4) -->
            <div
              v-if="mediaItems.length"
              class="mt-2 -mx-3"
              aria-hidden="true"
            >
              <!-- Horizontal filmstrip; overflow clipped; no user scrolling. -->
              <div class="no-scrollbar overflow-x-auto overflow-y-hidden pointer-events-none">
                <!-- Restore left padding only; right edge stays flush. -->
                <div class="flex gap-2 pl-3 pr-0">
                  <img
                    v-for="(m, idx) in mediaItems"
                    :key="m.id || idx"
                    :src="m.url"
                    class="h-24 w-auto shrink-0 rounded-lg object-cover bg-black/5 dark:bg-white/5"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm moh-text-muted">Post unavailable.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, GetPostData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  postId: string
  enabled?: boolean
}>()

const { apiFetchData } = useApiClient()

const id = computed(() => (props.postId ?? '').trim())
const permalink = computed(() => (id.value ? `/p/${encodeURIComponent(id.value)}` : null))
const enabled = computed(() => props.enabled !== false)

function goToPost() {
  if (!permalink.value) return
  return navigateTo(permalink.value)
}

function formatShortDate(d: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  const sameYear = now.getFullYear() === d.getFullYear()
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

const createdAtShort = computed(() => {
  try {
    return post.value?.createdAt ? formatShortDate(new Date(post.value.createdAt)) : ''
  } catch {
    return ''
  }
})

const bodyPreview = computed(() => {
  const raw = (post.value?.body ?? '').toString()
  const trimmed = raw.trim()
  if (trimmed.length <= 180) return trimmed
  return trimmed.slice(0, 180).replace(/\s+$/, '') + '…'
})

const mediaItems = computed(() => (post.value?.media ?? []).filter((m) => Boolean(m?.url)).slice(0, 4))

const key = computed(() => `embedded-post:${id.value || 'none'}`)

// SSR safety:
// Our previous pattern (immediate:false + watch(refresh)) could render the skeleton on the server
// while still delivering a hydrated post on the client, causing both DOM trees to coexist.
// Fix: allow Nuxt to await the initial fetch on SSR by using immediate:true on the server.
const immediate = computed(() => (import.meta.server ? true : enabled.value))

const { data, pending, error, refresh } = useAsyncData(
  key,
  async () => {
    const pid = id.value
    if (!pid) return null
    const res = await apiFetchData<GetPostData>('/posts/' + encodeURIComponent(pid), { method: 'GET' })
    return res ?? null
  },
  {
    server: true,
    lazy: true,
    immediate: immediate.value,
    watch: [id],
  },
)

const post = computed<FeedPost | null>(() => (data.value as FeedPost | null) ?? null)
const errorMessage = computed(() => (error.value ? getApiErrorMessage(error.value) || 'Failed to load embedded post.' : null))

const showSkeleton = computed(() => {
  if (!id.value) return false
  if (post.value) return false
  if (errorMessage.value) return false
  // If disabled (not near viewport), show placeholder but don't fetch yet.
  if (!enabled.value) return true
  return Boolean(pending.value)
})

watch(
  [enabled, id],
  ([en, pid]) => {
    // Avoid SSR/client hydration mismatch: SSR is handled by `immediate:true` above.
    if (import.meta.server) return
    if (!pid) return
    if (!en) return
    if (post.value) return
    if (errorMessage.value) return
    void refresh()
  },
  { immediate: true },
)

const { addInterest, removeInterest } = usePresence()
const lastAuthorId = ref<string | null>(null)
watch(
  () => post.value?.author?.id ?? null,
  (authorId) => {
    if (!import.meta.client) return
    const prev = lastAuthorId.value
    if (prev && prev !== authorId) removeInterest([prev])
    lastAuthorId.value = authorId ?? null
    if (authorId) addInterest([authorId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const id = lastAuthorId.value
  if (id) removeInterest([id])
})
</script>

