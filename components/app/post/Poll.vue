<template>
  <div
    class="mt-3"
    role="group"
    aria-label="Poll"
    @click.stop
  >
    <div class="flex items-center justify-between gap-3 mb-3">
      <div class="text-[11px] font-semibold moh-text-muted">
        {{ pollHeader }}
      </div>
      <div class="text-[11px] moh-text-muted tabular-nums">
        {{ endsLabel }}
      </div>
    </div>

    <!-- Results view -->
    <div v-if="showResults" class="flex flex-col gap-2">
      <div
        v-for="opt in pollView.options"
        :key="opt.id"
        class="relative w-full flex items-center gap-3 rounded-xl border overflow-hidden px-3 py-2.5"
        :class="isVotedOption(opt.id) ? accent.votedBorderClass : 'moh-border-subtle'"
      >
        <!-- Fill bar -->
        <div
          class="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
          :style="{
            width: `${Math.max(0, Math.min(100, opt.percent))}%`,
            backgroundColor: accent.color,
            opacity: pollView.viewerHasVoted && !isVotedOption(opt.id) ? 0.12 : 0.2,
          }"
        />

        <img
          v-if="opt.imageUrl"
          :src="opt.imageUrl"
          class="relative z-10 shrink-0 rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 cursor-zoom-in h-10 w-10"
          :alt="opt.alt || ''"
          loading="lazy"
          role="button"
          aria-label="View image"
          @click.stop="openOptionImage($event, opt.id)"
        />

        <div class="relative z-10 min-w-0 flex-1 flex items-center justify-between gap-3">
          <div
            class="min-w-0 truncate text-sm moh-text"
            :class="isVotedOption(opt.id) ? 'font-bold' : 'font-semibold'"
          >
            {{ opt.text }}
          </div>
          <div class="shrink-0 text-xs tabular-nums moh-text-muted font-medium">
            {{ opt.percent }}%
          </div>
        </div>
      </div>
    </div>

    <!-- Voting view -->
    <div v-else class="flex flex-col gap-2">
      <button
        v-for="opt in pollView.options"
        :key="opt.id"
        type="button"
        :class="[
          'w-full text-left flex items-center gap-3 rounded-xl border !bg-transparent px-3 py-2.5 transition-colors',
          accent.optionBorderClass, accent.optionHoverClass,
          'moh-focus disabled:opacity-60 disabled:cursor-default',
        ]"
        :disabled="voteDisabled"
        :aria-label="optionAriaLabel(opt)"
        @click="onVote(opt.id)"
      >
        <img
          v-if="opt.imageUrl"
          :src="opt.imageUrl"
          class="shrink-0 rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 cursor-zoom-in h-10 w-10"
          :alt="opt.alt || ''"
          loading="lazy"
          role="button"
          aria-label="View image"
          @click.stop="openOptionImage($event, opt.id)"
        />
        <div class="min-w-0 flex-1 text-sm moh-text font-semibold truncate">
          {{ opt.text }}
        </div>
      </button>
      <button
        v-if="viewerIsAuthor && !voteDisabled"
        type="button"
        :class="[
          'w-full text-left flex items-center gap-3 rounded-xl border !bg-transparent px-3 py-2.5 transition-colors text-sm moh-text-muted',
          'moh-border-subtle hover:!bg-black/5 dark:hover:!bg-white/10 moh-focus',
        ]"
        :disabled="skipping"
        aria-label="Skip voting to see how others vote"
        @click="onSkip"
      >
        <Icon name="tabler:eye" class="h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
        <span>Skip — see how others vote</span>
      </button>
    </div>

    <div class="mt-3 text-[11px] moh-text-muted tabular-nums">
      {{ pollView.totalVoteCount }} vote{{ pollView.totalVoteCount === 1 ? '' : 's' }}
      <span v-if="showResults && endedNow" class="ml-2">· Final results</span>
      <span v-else-if="showResults && pollView.viewerHasVoted" class="ml-2">(Results so far)</span>
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
const { user, isAuthed, isVerified: viewerIsVerified } = useAuth()
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
  // Public
  return {
    color: 'var(--p-primary-color)',
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
const showResults = computed(() =>
  Boolean(endedNow.value || pollView.value.viewerHasVoted),
)
const voting = ref(false)
const skipping = ref(false)

const voteDisabled = computed(() => {
  if (voting.value) return true
  if (!props.viewerCanInteract) return true
  if (!isAuthed.value) return false // clickable to prompt login
  if (endedNow.value) return true
  if (pollView.value.viewerHasVoted) return true
  return false
})

const pollHeader = computed(() => (showResults.value ? 'Poll results' : 'Poll'))
const endsLabel = computed(() => {
  const endsAt = new Date(pollView.value.endsAt)
  if (Number.isNaN(endsAt.getTime())) return ''
  return endedNow.value ? 'Done' : `Ends ${endsAt.toLocaleString('en-US')}`
})

function optionAriaLabel(opt: PostPollOption) {
  if (showResults.value) return `Option ${opt.text}, ${opt.percent} percent`
  return `Vote for ${opt.text}`
}

function isVotedOption(optionId: string) {
  return Boolean(pollView.value.viewerVotedOptionId && pollView.value.viewerVotedOptionId === optionId)
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

async function onSkip() {
  if (!viewerIsAuthor.value || !props.viewerCanInteract) return
  if (endedNow.value) return
  if (pollView.value.viewerHasVoted) return

  if (!isAuthed.value) {
    const redirect = encodeURIComponent(route.fullPath || '/home')
    return navigateTo(`/login?redirect=${redirect}`)
  }

  skipping.value = true
  try {
    const res = await apiFetchData<{ poll: PostPoll }>(`/posts/${encodeURIComponent(props.postId)}/poll/skip`, {
      method: 'POST',
    })
    if (res?.poll) {
      pollView.value = res.poll
      emit('updated', res.poll)
    }
  } catch (e: unknown) {
    toast.push({ title: 'Failed to skip', tone: 'error', durationMs: 2200 })
  } finally {
    skipping.value = false
  }
}
</script>


