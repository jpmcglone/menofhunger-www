<template>
  <div
    class="mt-3 rounded-xl border moh-border-subtle moh-surface-2 p-3"
    role="group"
    aria-label="Poll"
    @click.stop
  >
    <div class="flex items-center justify-between gap-3">
      <div class="text-[11px] font-semibold moh-text-muted">
        {{ pollHeader }}
      </div>
      <div class="text-[11px] moh-text-muted tabular-nums">
        {{ endsLabel }}
      </div>
    </div>

    <div class="mt-3 flex flex-col" :class="showResults ? 'gap-1.5' : 'gap-2'">
      <component
        :is="showResults ? 'div' : 'button'"
        v-for="opt in pollView.options"
        :key="opt.id"
        :type="showResults ? undefined : 'button'"
        :class="[
          'w-full text-left relative flex items-center gap-3 rounded-xl border !bg-transparent px-3 py-3 transition-colors min-h-[4.25rem]',
          showResults
            ? 'moh-border-subtle'
            : `${accent.optionBorderClass} ${accent.optionHoverClass} moh-focus disabled:opacity-60 disabled:cursor-default`,
          showResults && pollView.viewerVotedOptionId && opt.id === pollView.viewerVotedOptionId ? accent.votedBorderClass : '',
        ]"
        :disabled="showResults ? undefined : voteDisabled"
        :aria-label="optionAriaLabel(opt)"
        @click="showResults ? undefined : onVote(opt.id)"
      >
        <img
          v-if="opt.imageUrl"
          :src="opt.imageUrl"
          class="rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 cursor-zoom-in"
          :class="showResults ? 'h-8 w-8' : 'h-10 w-10'"
          :alt="opt.alt || ''"
          loading="lazy"
          role="button"
          aria-label="View image"
          @click.stop="openOptionImage($event, opt.id)"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 truncate text-sm moh-text font-semibold">
              {{ opt.text }}
            </div>
            <div v-if="showResults" class="shrink-0 text-xs tabular-nums moh-text-muted">
              {{ opt.percent }}%
            </div>
          </div>
        </div>

        <!-- Results bar: absolutely positioned so it doesn't affect vertical centering/layout -->
        <div v-if="showResults" class="pointer-events-none absolute left-3 right-3 bottom-2">
          <div class="w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden h-1.5">
            <div
              class="h-full rounded-full"
              :style="{ width: `${Math.max(0, Math.min(100, opt.percent))}%`, backgroundColor: barColor(opt.id) }"
            />
          </div>
        </div>
      </component>
    </div>

    <div class="mt-3 text-[11px] moh-text-muted tabular-nums">
      {{ pollView.totalVoteCount }} vote{{ pollView.totalVoteCount === 1 ? '' : 's' }}
      <span v-if="showResults && endedNow" class="ml-2">· Final results</span>
      <span v-else-if="showResults && (pollView.viewerHasVoted || viewerIsAuthor)" class="ml-2">· Results so far</span>
    </div>
  </div>
</template>

<script setup lang="ts">
type PostVisibility = import('~/types/api').PostVisibility

type PostPollOption = {
  id: string
  text: string
  imageUrl: string | null
  width: number | null
  height: number | null
  alt: string | null
  voteCount: number
  percent: number
}
type PostPoll = {
  id: string
  endsAt: string
  ended: boolean
  totalVoteCount: number
  viewerHasVoted: boolean
  viewerVotedOptionId: string | null
  options: PostPollOption[]
}

const props = defineProps<{
  postId: string
  poll: PostPoll
  viewerCanInteract: boolean
  viewerIsAuthor?: boolean
  postVisibility: PostVisibility
}>()

const emit = defineEmits<{
  (e: 'updated', poll: PostPoll): void
}>()

const { apiFetchData } = useApiClient()
const viewer = useImageLightbox()
const toast = useAppToast()
const route = useRoute()
const { user } = useAuth()
const { show: showAuthActionModal } = useAuthActionModal()

const postVisibility = computed<PostVisibility>(() => props.postVisibility ?? 'public')
const viewerIsAuthor = computed(() => props.viewerIsAuthor === true)
const accent = computed(() => {
  const v = postVisibility.value
  if (v === 'premiumOnly') {
    return {
      color: 'var(--moh-premium)',
      optionBorderClass: '!border-[color:var(--moh-premium)]',
      optionHoverClass: 'hover:!bg-[color:var(--moh-premium-soft)]',
      votedBorderClass: '!border-[color:var(--moh-premium)]',
    }
  }
  if (v === 'verifiedOnly') {
    return {
      color: 'var(--moh-verified)',
      optionBorderClass: '!border-[color:var(--moh-verified)]',
      optionHoverClass: 'hover:!bg-[color:var(--moh-verified-soft)]',
      votedBorderClass: '!border-[color:var(--moh-verified)]',
    }
  }
  if (v === 'onlyMe') {
    return {
      color: 'var(--moh-onlyme)',
      optionBorderClass: '!border-[color:var(--moh-onlyme)]',
      optionHoverClass: 'hover:!bg-[color:var(--moh-onlyme-soft)]',
      votedBorderClass: '!border-[color:var(--moh-onlyme)]',
    }
  }
  // Public: neutral
  return {
    color: 'var(--moh-border-strong)',
    optionBorderClass: '!border-[color:var(--moh-border-subtle)]',
    optionHoverClass: 'hover:!bg-black/5 dark:hover:!bg-white/10',
    votedBorderClass: '!border-[color:var(--moh-border-subtle)]',
  }
})

const pollView = ref<PostPoll>(props.poll)
watch(
  () => props.poll,
  (p) => {
    if (p) pollView.value = p
  },
)

const isAuthed = computed(() => Boolean(user.value?.id))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const endedForce = ref(false)
let endTimer: ReturnType<typeof setTimeout> | null = null

function scheduleEndFlip() {
  if (!import.meta.client) return
  if (endTimer) clearTimeout(endTimer)
  endTimer = null
  endedForce.value = false

  if (pollView.value.ended) return
  const endsAtMs = new Date(pollView.value.endsAt).getTime()
  if (!Number.isFinite(endsAtMs)) return
  const ms = endsAtMs - Date.now()
  if (ms <= 0) {
    endedForce.value = true
    return
  }
  // Polls max 7 days; safe timeout range. Nudge slightly after boundary.
  endTimer = setTimeout(() => {
    endedForce.value = true
  }, ms + 250)
}

watch(
  () => [pollView.value.endsAt, pollView.value.ended] as const,
  () => scheduleEndFlip(),
  { immediate: true },
)
onBeforeUnmount(() => {
  if (endTimer) clearTimeout(endTimer)
  endTimer = null
})

const endedNow = computed(() => Boolean(pollView.value.ended || endedForce.value))
const showResults = computed(() => Boolean(endedNow.value || pollView.value.viewerHasVoted || viewerIsAuthor.value))
const voting = ref(false)

const voteDisabled = computed(() => {
  if (voting.value) return true
  if (!props.viewerCanInteract) return true
  if (!isAuthed.value) return false // clickable to prompt login
  if (endedNow.value) return true
  if (pollView.value.viewerHasVoted) return true
  if (viewerIsAuthor.value) return true
  return false
})

const pollHeader = computed(() => (showResults.value ? 'Poll results' : 'Poll'))
const endsLabel = computed(() => {
  const endsAt = new Date(pollView.value.endsAt)
  if (Number.isNaN(endsAt.getTime())) return ''
  return endedNow.value ? 'Done' : `Ends ${endsAt.toLocaleString()}`
})

function optionAriaLabel(opt: PostPollOption) {
  if (showResults.value) return `Option ${opt.text}, ${opt.percent} percent`
  return `Vote for ${opt.text}`
}

function barColor(optionId: string) {
  // In results mode we tint all bars by the poll/post tier (not the viewer).
  if (showResults.value) return accent.value.color
  if (pollView.value.viewerVotedOptionId && optionId === pollView.value.viewerVotedOptionId) return accent.value.color
  return 'rgba(0,0,0,0.25)'
}

function openOptionImage(e: MouseEvent, optionId: string) {
  const opts = pollView.value?.options ?? []
  const current = opts.find((o) => o.id === optionId) ?? null
  const url = (current?.imageUrl ?? '').trim()
  if (!url) return

  const urls = opts
    .map((o) => (o.imageUrl ?? '').trim())
    .filter(Boolean)
  const idx = Math.max(0, urls.findIndex((u) => u === url))
  viewer.openGalleryFromEvent(e, urls, idx, 'Image', { mediaStartMode: 'fitAnchored' })
}

async function onVote(optionId: string) {
  if (!props.viewerCanInteract) return
  if (endedNow.value) return
  if (pollView.value.viewerHasVoted) return

  if (!isAuthed.value) {
    const redirect = encodeURIComponent(route.fullPath || '/home')
    return navigateTo(`/login?redirect=${redirect}`)
  }

  if (!viewerIsVerified.value) {
    showAuthActionModal({ kind: 'verify', action: 'poll' })
    return
  }

  voting.value = true
  try {
    const res = await apiFetchData<{ poll: PostPoll }>(`/posts/${encodeURIComponent(props.postId)}/poll/vote`, {
      method: 'POST',
      body: { optionId },
    })
    if (res?.poll) {
      pollView.value = res.poll
      emit('updated', res.poll)
    }
  } catch (e: unknown) {
    toast.push({ title: 'Failed to vote', tone: 'error', durationMs: 2200 })
  } finally {
    voting.value = false
  }
}
</script>

