<template>
  <!-- Always render as <a> so right-click / cmd+click / middle-click "open in new tab" works.
       @click lets modifier-clicks (cmd/ctrl/middle) open a new tab natively; only plain
       left-clicks are intercepted for client-side SPA navigation. -->
  <a
    :href="permalink ?? undefined"
    :class="[
      'mt-3 block overflow-hidden rounded-xl border moh-border moh-surface transition-colors moh-surface-hover',
      permalink ? 'cursor-pointer' : 'pointer-events-none',
    ]"
    role="group"
    aria-label="Embedded post preview"
    :aria-busy="showSkeleton ? 'true' : 'false'"
    @click="onEmbeddedClick"
  >
    <div class="p-3">
      <!-- Skeleton -->
      <div v-if="showSkeleton" class="space-y-2" aria-hidden="true">
        <div class="flex items-center gap-2">
          <div class="h-5 w-5 rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse shrink-0" />
          <div class="h-3 w-28 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
          <div class="h-3 w-16 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div class="h-3 w-full rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
        <div class="h-3 w-4/5 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />
      </div>

      <div v-else-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</div>

      <div v-else-if="post">
        <!-- Compact single-line header -->
        <div class="flex min-w-0 items-center gap-1.5">
          <AppUserAvatar
            :user="author"
            size-class="h-5 w-5"
            bg-class="moh-surface"
          />
          <span class="text-sm font-semibold moh-text truncate leading-none">
            {{ author?.name || author?.username || 'User' }}
          </span>
          <AppVerifiedBadge
            class="shrink-0"
            :status="author?.verifiedStatus ?? 'none'"
            :premium="author?.premium ?? false"
            :premium-plus="author?.premiumPlus ?? false"
            :is-organization="Boolean(author?.isOrganization)"
            :steward-badge-enabled="author?.stewardBadgeEnabled ?? true"
          />
          <span class="text-sm moh-text-muted truncate leading-none">@{{ author?.username || 'user' }}</span>
          <span class="ml-auto shrink-0 text-xs moh-text-muted leading-none">{{ createdAtShort }}</span>
        </div>

        <!-- Access gate: body/media were stripped server-side for this viewer -->
        <div
          v-if="post.viewerCanAccess === false"
          class="mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50"
        >
          <Icon name="tabler:lock" class="text-[11px] shrink-0" aria-hidden="true" />
          Members only
        </div>

        <!-- Body — clamped to 4 lines so the preview stays compact -->
        <div
          v-else-if="bodyPreview"
          class="mt-1.5 text-sm moh-text break-words line-clamp-4"
        >{{ bodyPreview }}</div>

        <!-- Poll indicator — don't render the actual poll, just signal it's there -->
        <div
          v-if="hasPoll"
          class="mt-1.5 text-xs font-medium"
          :style="pollTextStyle"
        >View poll</div>

        <!-- Check-in indicator -->
        <div
          v-if="isCheckin"
          class="mt-1.5 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium w-fit"
          style="background-color: var(--moh-checkin-soft); color: var(--moh-checkin)"
        >
          <Icon name="tabler:calendar-check" class="text-[11px] shrink-0" aria-hidden="true" />
          {{ checkinPrompt || 'Check-in' }}
        </div>

        <!-- Media: non-interactive — clicks pass through to the <a> wrapper -->
        <AppPostMediaGrid
          v-if="mediaItems.length && post.viewerCanAccess !== false"
          :media="mediaItems"
          compact
          :interactive="false"
        />
      </div>

      <div v-else class="text-sm moh-text-muted">Post unavailable.</div>
    </div>
  </a>
</template>

<script setup lang="ts">
import type { FeedPost, GetPostData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { usePreviewFetchLimiter } from '~/composables/usePreviewFetchLimiter'

const props = defineProps<{
  postId?: string
  /** Pre-loaded post — skips the API fetch when provided. */
  preloadedPost?: FeedPost | null
  enabled?: boolean
}>()

const router = useRouter()
const { apiFetchData } = useApiClient()

const id = computed(() => (props.postId ?? props.preloadedPost?.id ?? '').trim())
const permalink = computed(() => (id.value ? `/p/${encodeURIComponent(id.value)}` : null))
const enabled = computed(() => props.enabled !== false)
const preloadedPost = computed(() => props.preloadedPost ?? null)
const { runLimited } = usePreviewFetchLimiter()
const PREVIEW_FETCH_DWELL_MS = 400

function onEmbeddedClick(e: MouseEvent) {
  if (!permalink.value) return
  // Let cmd/ctrl+click and middle-click open in a new tab natively.
  if (e.metaKey || e.ctrlKey) return
  e.preventDefault()
  void router.push(permalink.value)
}

// SSR-safe: use shared nowMs so server and client render identical relative times.
const { nowMs } = useNowTicker({ everyMs: 15_000 })

function formatShortDate(d: Date, nowMsVal: number): string {
  const diffMs = Math.max(0, Math.floor((nowMsVal || 0) - d.getTime()))
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  const sameYear = new Date(nowMsVal).getFullYear() === d.getFullYear()
  // Fixed locale for SSR: server and client must produce identical output.
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

const createdAtShort = computed(() => {
  try {
    return post.value?.createdAt
      ? formatShortDate(new Date(post.value.createdAt), nowMs.value)
      : ''
  } catch {
    return ''
  }
})

const bodyPreview = computed(() => {
  // Return the full text; visual truncation is handled by CSS line-clamp in the template.
  return (post.value?.body ?? '').toString().trim()
})

const hasPoll = computed(() => Boolean(post.value?.poll))
const isCheckin = computed(() => post.value?.kind === 'checkin')
const checkinPrompt = computed(() => (post.value?.checkinPrompt ?? '').trim() || null)

const pollTextStyle = computed((): Record<string, string> => {
  const v = post.value?.visibility
  if (v === 'verifiedOnly') return { color: 'var(--moh-verified)' }
  if (v === 'premiumOnly') return { color: 'var(--moh-premium)' }
  if (v === 'onlyMe') return { color: 'var(--moh-onlyme)' }
  return { color: 'var(--moh-text-muted)' }
})

const mediaItems = computed(() => (post.value?.media ?? []).filter((m) => Boolean(m?.url)).slice(0, 4))

const key = computed(() => `embedded-post:${id.value || 'none'}`)
const fetchAttempted = ref(false)

const { data, pending, error, refresh } = useAsyncData(
  key,
  async () => {
    // If a pre-loaded post was provided, skip the network fetch.
    if (preloadedPost.value) return null
    const pid = id.value
    if (!pid) return null
    const res = await runLimited(
      async () => await apiFetchData<GetPostData>('/posts/' + encodeURIComponent(pid), { method: 'GET' }),
    )
    return res ?? null
  },
  {
    server: false,
    lazy: true,
    immediate: false,
    watch: [id],
  },
)

const post = computed<FeedPost | null>(() => preloadedPost.value ?? (data.value as FeedPost | null) ?? null)
const { user: author } = useUserOverlay(computed(() => post.value?.author ?? null))
const errorMessage = computed(() => (error.value ? getApiErrorMessage(error.value) || 'Failed to load embedded post.' : null))

const showSkeleton = computed(() => {
  if (!id.value) return false
  if (post.value) return false
  if (errorMessage.value) return false
  // Show placeholder while waiting to scroll into view.
  if (!enabled.value) return true
  // Keep showing skeleton until the dwell timer fires and the first fetch begins.
  // Without this, there is a ~400ms window after the row enters the viewport where
  // pending=false, post=null → the "Post unavailable" fallback briefly flashes.
  if (!fetchAttempted.value) return true
  return Boolean(pending.value)
})

watch(
  [enabled, id],
  ([en, pid], _old, onCleanup) => {
    // Reset on every id/enabled change so re-entering the viewport triggers a fresh skeleton.
    fetchAttempted.value = false
    let timer: ReturnType<typeof setTimeout> | null = null
    onCleanup(() => {
      if (timer) clearTimeout(timer)
      timer = null
    })

    if (!pid) return
    if (!en) return
    if (preloadedPost.value) return
    if (post.value) return
    if (errorMessage.value) return

    timer = setTimeout(() => {
      fetchAttempted.value = true
      void refresh()
    }, PREVIEW_FETCH_DWELL_MS)
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
