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
      :aria-expanded="breakdownVisible && likeCount > 0"
      aria-haspopup="dialog"
      :aria-controls="panelId"
      @click="onLikeClick"
      @mouseenter="onHover"
      @focus="onHover"
      @mouseleave="onLeave"
      @blur="onLeave"
      @keydown.esc.stop.prevent="hideBreakdown(true)"
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
          :id="panelId"
          ref="breakdownEl"
          class="moh-count-breakdown"
          :style="breakdownStyle"
          role="dialog"
          :aria-labelledby="`${panelId}-title`"
          @mouseenter="cancelClose"
          @mouseleave="onLeave"
          @focusout="onLeave"
          @keydown.esc.stop.prevent="hideBreakdown(true)"
        >
          <header class="moh-count-breakdown-header">
            <div>
              <h2 :id="`${panelId}-title`"><AppAnimatedCount :value="likeCount" /> {{ likeCount === 1 ? 'like' : 'likes' }}</h2>
              <p>Likes by membership</p>
            </div>
            <button type="button" class="moh-count-breakdown-close moh-tap" aria-label="Close breakdown" @click="hideBreakdown(true)"><Icon name="tabler:x" aria-hidden="true" /></button>
          </header>
          <div v-if="breakdown" class="moh-count-breakdown-section">
            <div v-for="row in visibleRows" :key="row.key" class="moh-count-breakdown-row">
              <span class="moh-count-breakdown-label"><span class="moh-count-breakdown-dot" :class="row.dotClass" aria-hidden="true" />{{ row.label }}</span>
              <span class="moh-count-breakdown-value">{{ row.count.toLocaleString('en-US') }}</span>
            </div>
          </div>
          <p v-else-if="breakdownLoading" class="moh-count-breakdown-status animate-pulse" role="status">Loading…</p>
          <p v-else-if="breakdownFailed" class="moh-count-breakdown-status" role="status">Couldn't load breakdown.</p>
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
const panelId = `like-breakdown-${useId()}`
let closeTimer: ReturnType<typeof setTimeout> | undefined
let restoringFocus = false
const btnEl = ref<HTMLElement | null>(null)
const breakdownVisible = ref(false)
const breakdown = ref<WotdLikeBreakdown | null>(null)
const breakdownLoading = ref(false)
const breakdownFailed = ref(false)
let breakdownSeq = 0
const visibleRows = computed(() => {
  const b = breakdown.value
  if (!b) return []
  return [
    { key: 'premium', label: 'Premium', count: b.premium, dotClass: 'bg-yellow-400' },
    { key: 'verified', label: 'Verified', count: b.verified, dotClass: 'bg-blue-400' },
    { key: 'unverified', label: 'Unverified', count: b.unverified, dotClass: 'bg-gray-400' },
  ].filter(row => row.count > 0)
})

const {
  style: breakdownStyle,
  menuEl: breakdownEl,
  place: placeBreakdown,
  reset: resetBreakdown,
  remeasure: remeasureBreakdown,
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
  if (likeCount.value === 0 || restoringFocus) return
  cancelClose()
  const anchor = event?.currentTarget instanceof HTMLElement ? event.currentTarget : btnEl.value
  if (anchor) {
    placeBreakdown(anchor, { align: 'start', gap: 12, menuWidth: 390, menuHeight: 280, maxHeight: Math.max(96, window.innerHeight - 32), trackViewport: true })
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
    if (seq === breakdownSeq) {
      breakdownLoading.value = false
      nextTick(remeasureBreakdown)
    }
  }
}

function cancelClose() {
  clearTimeout(closeTimer)
  closeTimer = undefined
}

function hideBreakdown(restoreFocus = false) {
  cancelClose()
  breakdownVisible.value = false
  resetBreakdown()
  if (restoreFocus && document.activeElement !== btnEl.value) {
    restoringFocus = true
    btnEl.value?.focus({ preventScroll: true })
    restoringFocus = false
  }
}

function onLeave(event: Event) {
  if (event instanceof FocusEvent) {
    const next = event.relatedTarget
    if (next instanceof Node && (breakdownEl.value?.contains(next) || btnEl.value?.contains(next))) return
    hideBreakdown()
    return
  }
  if (breakdownEl.value?.contains(document.activeElement)) return
  cancelClose()
  closeTimer = setTimeout(() => hideBreakdown(), 160)
}

function onOutsidePointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node) || btnEl.value?.contains(target) || breakdownEl.value?.contains(target)) return
  hideBreakdown()
}

onMounted(() => document.addEventListener('pointerdown', onOutsidePointerDown, true))
onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', onOutsidePointerDown, true)
})
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
