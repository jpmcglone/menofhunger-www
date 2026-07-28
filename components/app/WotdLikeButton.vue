<template>
  <div class="relative inline-flex items-center gap-1.5">
    <!-- Like button -->
    <button
      ref="btnEl"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
      :class="[
        liked
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'moh-surface-hover moh-text-muted',
        !isLoggedIn ? 'cursor-default' : '',
      ]"
      :aria-label="liked ? 'Unlike this word' : 'Like this word'"
      :aria-pressed="liked"
      @click="onLikeClick"
      @mouseenter="onHover"
      @focus="onHover"
      @mouseleave="hideBreakdown"
      @blur="hideBreakdown"
    >
      <Icon
        :name="liked ? 'tabler:thumb-up-filled' : 'tabler:thumb-up'"
        class="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <AppAnimatedCount :value="likeCount" :format="formatCount" class="tabular-nums" />
    </button>

    <!-- Breakdown popover -->
    <Teleport to="body">
      <Transition name="wotd-like-breakdown">
        <div
          v-if="breakdownVisible && likeCount > 0"
          ref="breakdownEl"
          class="fixed z-[9999] min-w-[10rem] rounded-lg border moh-border moh-surface shadow-lg px-3 py-2.5 text-[11px] sm:text-xs"
          :style="breakdownStyle"
          role="tooltip"
        >
          <p class="mb-1.5 font-semibold moh-text tabular-nums">
            <AppAnimatedCount :value="likeCount" />
            {{ likeCount === 1 ? 'like' : 'likes' }}
          </p>
          <template v-if="breakdown">
            <div class="flex flex-col gap-1 moh-text-muted">
              <div v-if="breakdown.premium > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-yellow-400 shrink-0" aria-hidden="true" />
                  Premium
                </span>
                <span class="tabular-nums font-medium moh-text">{{ breakdown.premium }}</span>
              </div>
              <div v-if="breakdown.verified > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                  Verified
                </span>
                <span class="tabular-nums font-medium moh-text">{{ breakdown.verified }}</span>
              </div>
              <div v-if="breakdown.unverified > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-gray-400 shrink-0" aria-hidden="true" />
                  Unverified
                </span>
                <span class="tabular-nums font-medium moh-text">{{ breakdown.unverified }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="breakdownLoading">
            <div class="moh-text-muted animate-pulse">Loading…</div>
          </template>
          <template v-else-if="breakdownFailed">
            <div class="moh-text-muted">Couldn't load breakdown.</div>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { WotdLikeBreakdown, WotdLikeToggle, Websters1828WordOfDay } from '~/types/api'
import { formatShortCount } from '~/utils/text'

const props = defineProps<{
  initialCount: number
  initialLiked: boolean
}>()

const emit = defineEmits<{
  (e: 'like-toggled', result: WotdLikeToggle): void
}>()

const { apiFetchData } = useApiClient()
const { isAuthed: isLoggedIn } = useAuth()

// Shared cache — patching this makes the right-rail card update instantly
const { data: cachedWotd } = useNuxtData<Websters1828WordOfDay>('websters1828:wotd')

// Local state (optimistic)
const likeCount = ref(props.initialCount)
const liked = ref(props.initialLiked)

// Sync when props change (e.g. daily socket refresh)
watch(() => props.initialCount, (v) => { likeCount.value = v })
watch(() => props.initialLiked, (v) => { liked.value = v })

// Breakdown popover
const btnEl = ref<HTMLElement | null>(null)
const breakdownVisible = ref(false)
const breakdown = ref<WotdLikeBreakdown | null>(null)
const breakdownLoading = ref(false)
const breakdownFailed = ref(false)
let breakdownSeq = 0

const {
  style: breakdownStyle,
  menuEl: breakdownEl,
  place: placeBreakdown,
  reset: resetBreakdown,
} = useMenuPosition()

function formatCount(n: number) {
  return n === 0 ? '0' : formatShortCount(n)
}

async function onLikeClick() {
  if (!isLoggedIn.value) return
  // Optimistic toggle
  const wasLiked = liked.value
  liked.value = !wasLiked
  likeCount.value += wasLiked ? -1 : 1
  try {
    const result = await apiFetchData<WotdLikeToggle>('/meta/websters1828/wotd/like', {
      method: 'POST',
    })
    liked.value = result.liked
    likeCount.value = result.likeCount
    // Patch the shared Nuxt data cache so the right-rail card updates instantly
    if (cachedWotd.value) {
      cachedWotd.value = {
        ...cachedWotd.value,
        likeCount: result.likeCount,
        viewerHasLiked: result.liked,
      }
    }
    // Invalidate cached breakdown so hover re-fetches
    breakdown.value = null
    emit('like-toggled', result)
  } catch {
    // Roll back optimistic change
    liked.value = wasLiked
    likeCount.value += wasLiked ? 1 : -1
  }
}

async function onHover(event?: Event) {
  if (likeCount.value === 0) return
  const anchor = event?.currentTarget instanceof HTMLElement ? event.currentTarget : btnEl.value
  if (anchor) {
    placeBreakdown(anchor, { align: 'start', gap: 6, menuWidth: 176, menuHeight: 120 })
  }
  breakdownVisible.value = true
  if (breakdownLoading.value || breakdown.value) return
  breakdownLoading.value = true
  breakdownFailed.value = false
  const seq = ++breakdownSeq
  try {
    const result = await apiFetchData<WotdLikeBreakdown>('/meta/websters1828/wotd/likes/breakdown')
    if (seq === breakdownSeq) {
      breakdown.value = result
      breakdownFailed.value = false
    }
  } catch {
    if (seq === breakdownSeq) breakdownFailed.value = true
  } finally {
    if (seq === breakdownSeq) breakdownLoading.value = false
  }
}

function hideBreakdown() {
  breakdownVisible.value = false
  resetBreakdown()
}
</script>

<style scoped>
.wotd-like-breakdown-enter-active,
.wotd-like-breakdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.wotd-like-breakdown-enter-from,
.wotd-like-breakdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
