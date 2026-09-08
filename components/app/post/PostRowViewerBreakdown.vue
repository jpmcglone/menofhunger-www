<template>
  <div class="relative inline-flex items-center justify-end">
    <button
      ref="viewerCountBtnEl"
      type="button"
      class="moh-tap group relative z-10 inline-flex items-center gap-1 px-0.5 py-0.5 tabular-nums select-none transition-colors"
      :class="viewerCount > 0 ? 'cursor-pointer' : 'cursor-default opacity-0 pointer-events-none'"
      :aria-label="ariaLabel"
      :aria-expanded="viewerBreakdownVisible" aria-haspopup="dialog" :aria-controls="panelId"
      :tabindex="viewerCount > 0 ? 0 : -1"
      @mouseenter="onViewerCountHover"
      @focus="onViewerCountHover"
      @mouseleave="onViewerCountLeave"
      @blur="onViewerCountLeave"
      @keydown.esc.stop.prevent="hideViewerBreakdown(true)"
      @click.stop.prevent="onViewerCountClick"
    >
      <span
        class="inline-flex items-center gap-1"
        :class="hasViewed ? 'moh-text' : 'moh-text-muted group-hover:moh-text'"
      >
        <Icon
          name="tabler:user"
          class="text-[14px] transition-colors duration-500 ease-out"
          :class="justViewed ? 'moh-view-pop' : ''"
          aria-hidden="true"
        />
        <span class="text-[12px] tabular-nums transition-colors duration-500 ease-out">
          <AppAnimatedCount :value="viewerCount" :format="formatChipCount" />
        </span>
      </span>
      <span class="inline-flex items-center gap-1 moh-text-muted transition-colors group-hover:moh-text">
        <span class="text-[11px] leading-none opacity-70" aria-hidden="true">·</span>
        <Icon name="tabler:eye" class="text-[12px]" aria-hidden="true" />
        <span class="text-[11px] tabular-nums">
          <AppAnimatedCount :value="chipTotal" :format="formatChipCount" />
        </span>
      </span>
    </button>

    <Teleport to="body">
      <Transition name="viewer-breakdown">
        <div
          v-if="viewerBreakdownVisible"
          :id="panelId" ref="viewerBreakdownEl"
          class="moh-count-breakdown"
          :style="viewerBreakdownStyle"
          role="dialog" :aria-labelledby="`${panelId}-title`"
          @mouseenter="cancelViewerClose" @mouseleave="onViewerCountLeave" @focusout="onViewerCountLeave"
          @keydown.esc.stop.prevent="hideViewerBreakdown(true)"
        >
          <header class="moh-count-breakdown-header">
            <div>
              <h2 :id="`${panelId}-title`"><AppAnimatedCount :value="hoverTotal" :format="formatExactCount" /> total views</h2>
              <p><AppAnimatedCount :value="hoverUnique" :format="formatExactCount" /> {{ hoverUnique === 1 ? 'person' : 'people' }} {{ peopleVerb }}</p>
            </div>
            <button type="button" class="moh-count-breakdown-close moh-tap" aria-label="Close breakdown" @click="hideViewerBreakdown(true)"><Icon name="tabler:x" aria-hidden="true" /></button>
          </header>
          <template v-if="viewerBreakdown">
            <p class="moh-count-breakdown-columns">People · total views</p>
            <div class="moh-count-breakdown-section">
              <div v-for="row in visibleTierRows" :key="row.key" class="moh-count-breakdown-row">
                <span class="moh-count-breakdown-label">
                  <span class="moh-count-breakdown-dot" :class="row.dotClass" aria-hidden="true" />{{ row.label }}
                </span>
                <span class="moh-count-breakdown-value" :aria-label="`${formatExactCount(row.unique)} people, ${formatExactCount(Math.max(row.unique, row.total))} total views`">
                  {{ formatExactCount(row.unique) }}<span class="moh-count-breakdown-secondary"> · {{ formatExactCount(Math.max(row.unique, row.total)) }}</span>
                </span>
              </div>
            </div>
          </template>
          <p v-else-if="viewerBreakdownLoading" class="moh-count-breakdown-status animate-pulse" role="status">Loading…</p>
          <p v-else-if="viewerBreakdownFailed" class="moh-count-breakdown-status" role="status">Couldn't load breakdown.</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ArticleViewBreakdown, PostViewBreakdown } from '~/types/api'
import { formatShortCount } from '~/utils/text'

const props = withDefaults(defineProps<{
  entityId: string
  breakdownPath: string
  viewerCount: number
  totalViewCount?: number
  hasViewed?: boolean
  peopleVerb?: string
}>(), {
  totalViewCount: 0,
  hasViewed: false,
  peopleVerb: 'saw this',
})

const emit = defineEmits<{
  countSynced: [payload: { viewerCount: number, totalViewCount: number }]
}>()

const formatChipCount = (n: number) => n === 0 ? ' ' : formatShortCount(n)
const formatExactCount = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US')

const chipTotal = computed(() => Math.max(props.viewerCount, props.totalViewCount))

const ariaLabel = computed(() => {
  if (props.viewerCount <= 0) return 'Views'
  const people = `${props.viewerCount} ${props.viewerCount === 1 ? 'person' : 'people'} ${props.peopleVerb}`
  const seen = props.hasViewed ? 'You viewed this — ' : ''
  return `${seen}${people}, ${chipTotal.value.toLocaleString('en-US')} total views`
})

const justViewed = ref(false)
let justViewedTimer: ReturnType<typeof setTimeout> | null = null
watch(() => props.hasViewed, (v, prev) => {
  if (!v || prev) return
  justViewed.value = true
  if (justViewedTimer) clearTimeout(justViewedTimer)
  justViewedTimer = setTimeout(() => { justViewed.value = false }, 600)
})
onBeforeUnmount(() => {
  if (justViewedTimer) clearTimeout(justViewedTimer)
  unbindOutsideClose()
  cancelViewerClose()
})

const { apiFetchData } = useApiClient()

const panelId = `view-breakdown-${useId()}`
let viewerCloseTimer: ReturnType<typeof setTimeout> | undefined
let restoringFocus = false
const viewerCountBtnEl = ref<HTMLElement | null>(null)
const viewerBreakdownVisible = ref(false)
const viewerBreakdown = ref<(PostViewBreakdown | ArticleViewBreakdown) | null>(null)
const viewerBreakdownLoading = ref(false)
const viewerBreakdownFailed = ref(false)
let viewerBreakdownRequestSeq = 0

const hoverUnique = computed(() => viewerBreakdown.value?.total ?? props.viewerCount)
const hoverTotal = computed(() =>
  Math.max(hoverUnique.value, viewerBreakdown.value?.totalViewCount ?? props.totalViewCount),
)

const visibleTierRows = computed(() => {
  const b = viewerBreakdown.value
  if (!b) return []
  return [
    { key: 'premium', label: 'Premium', unique: b.premium, total: b.premiumTotal, dotClass: 'bg-yellow-400' },
    { key: 'verified', label: 'Verified', unique: b.verified, total: b.verifiedTotal, dotClass: 'bg-blue-400' },
    { key: 'unverified', label: 'Unverified', unique: b.unverified, total: b.unverifiedTotal, dotClass: 'bg-gray-400' },
    { key: 'guest', label: 'Guests', unique: b.guest, total: b.guestTotal, dotClass: 'bg-gray-500/60' },
  ].filter((row) => row.unique > 0 || row.total > 0)
})

const {
  style: viewerBreakdownStyle,
  menuEl: viewerBreakdownEl,
  place: placeViewerBreakdown,
  reset: resetViewerBreakdownPosition,
  remeasure: remeasureViewerBreakdown,
} = useMenuPosition()

function placeViewerBreakdownFrom(anchorEl: HTMLElement | null) {
  if (!anchorEl) return
  placeViewerBreakdown(anchorEl, {
    align: 'end',
    gap: 12,
    menuWidth: 390,
    menuHeight: 340,
    maxHeight: Math.max(96, window.innerHeight - 32),
    trackViewport: true,
  })
}

function isCoarsePointer() {
  if (!import.meta.client) return false
  return window.matchMedia?.('(pointer: coarse)').matches === true
}

async function showViewerBreakdown(event?: Event) {
  cancelViewerClose()
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : viewerCountBtnEl.value
  placeViewerBreakdownFrom(anchorEl)
  viewerBreakdownVisible.value = true
  placeViewerBreakdownFrom(anchorEl)
  bindOutsideClose()
  if (viewerBreakdownLoading.value) return
  viewerBreakdownFailed.value = false
  viewerBreakdownLoading.value = true
  const requestSeq = ++viewerBreakdownRequestSeq
  try {
    const result = await apiFetchData<PostViewBreakdown | ArticleViewBreakdown>(
      props.breakdownPath,
    )
    if (requestSeq === viewerBreakdownRequestSeq) {
      viewerBreakdown.value = result
      viewerBreakdownFailed.value = false
      emit('countSynced', {
        viewerCount: Math.max(0, Math.floor(Number(result?.total ?? 0))),
        totalViewCount: Math.max(0, Math.floor(Number(result?.totalViewCount ?? result?.total ?? 0))),
      })
    }
  } catch {
    if (requestSeq === viewerBreakdownRequestSeq) {
      viewerBreakdownFailed.value = true
    }
  } finally {
    if (requestSeq === viewerBreakdownRequestSeq) {
      viewerBreakdownLoading.value = false
      nextTick(remeasureViewerBreakdown)
    }
  }
}

function cancelViewerClose() {
  clearTimeout(viewerCloseTimer)
  viewerCloseTimer = undefined
}

function hideViewerBreakdown(restoreFocus = false) {
  cancelViewerClose()
  viewerBreakdownVisible.value = false
  resetViewerBreakdownPosition()
  unbindOutsideClose()
  if (restoreFocus && document.activeElement !== viewerCountBtnEl.value) {
    restoringFocus = true
    viewerCountBtnEl.value?.focus({ preventScroll: true })
    restoringFocus = false
  }
}

function onViewerCountHover(event?: Event) {
  if (isCoarsePointer() || restoringFocus) return
  void showViewerBreakdown(event)
}

function onViewerCountLeave(event?: Event) {
  if (event instanceof FocusEvent) {
    const next = event.relatedTarget
    if (next instanceof Node && (viewerBreakdownEl.value?.contains(next) || viewerCountBtnEl.value?.contains(next))) return
    hideViewerBreakdown()
    return
  }
  if (isCoarsePointer() || viewerBreakdownEl.value?.contains(document.activeElement)) return
  cancelViewerClose()
  viewerCloseTimer = setTimeout(() => hideViewerBreakdown(), 160)
}

function onViewerCountClick(event: MouseEvent) {
  if (isCoarsePointer()) {
    if (viewerBreakdownVisible.value) hideViewerBreakdown()
    else void showViewerBreakdown(event)
    return
  }
  void showViewerBreakdown(event)
}

const outsideCloseOpts: AddEventListenerOptions = { capture: true }
function onDocPointerDown(event: Event) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (viewerCountBtnEl.value?.contains(target)) return
  if (viewerBreakdownEl.value?.contains(target)) return
  hideViewerBreakdown()
}

function bindOutsideClose() {
  if (!import.meta.client) return
  document.addEventListener('pointerdown', onDocPointerDown, outsideCloseOpts)
}

function unbindOutsideClose() {
  if (!import.meta.client) return
  document.removeEventListener('pointerdown', onDocPointerDown, outsideCloseOpts)
}
</script>

<style scoped>
.viewer-breakdown-enter-active,
.viewer-breakdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.viewer-breakdown-enter-from,
.viewer-breakdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes moh-view-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.22); }
  100% { transform: scale(1); }
}
.moh-view-pop { animation: moh-view-pop 420ms cubic-bezier(0.2, 0.8, 0.2, 1); }
@media (prefers-reduced-motion: reduce) { .moh-view-pop { animation: none; } }
</style>
