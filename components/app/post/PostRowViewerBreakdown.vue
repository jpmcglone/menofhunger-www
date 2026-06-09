<template>
  <div class="relative inline-flex items-center">
    <button
      ref="viewerCountBtnEl"
      type="button"
      class="moh-tap inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors"
      :class="viewerCount > 0 ? 'moh-surface-hover cursor-default' : 'cursor-default opacity-60'"
      :aria-label="viewerCount > 0 ? `${viewerCount} ${viewerCount === 1 ? 'person' : 'people'} saw this post` : 'Views'"
      :tabindex="viewerCount > 0 ? 0 : -1"
      @mouseenter="onViewerCountHover"
      @focus="onViewerCountHover"
      @mouseleave="hideViewerBreakdown"
      @blur="hideViewerBreakdown"
      @click.stop
    >
      <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </button>
    <span
      class="ml-0 inline-block sm:min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted moh-count-gutter"
      :class="viewerCount > 0 ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    >
      <AppAnimatedCount :value="viewerCount" :format="formatCountOrBlank" />
    </span>

    <!-- Breakdown popover: teleported to body so it's never clipped by a parent stacking context -->
    <Teleport to="body">
      <Transition name="viewer-breakdown">
        <div
          v-if="viewerBreakdownVisible"
          ref="viewerBreakdownEl"
          class="fixed z-[9999] min-w-[10rem] rounded-lg border moh-border moh-surface shadow-lg px-3 py-2.5 text-[11px] sm:text-xs"
          :style="viewerBreakdownStyle"
          role="tooltip"
        >
          <p class="mb-1.5 font-semibold moh-text tabular-nums">
            <AppAnimatedCount :value="viewerCount" />
            {{ viewerCount === 1 ? 'person' : 'people' }} saw this
          </p>
          <template v-if="viewerBreakdown">
            <div class="flex flex-col gap-1 moh-text-muted">
              <div v-if="viewerBreakdown.premium > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-yellow-400 shrink-0" aria-hidden="true" />
                  Premium
                </span>
                <span class="tabular-nums font-medium moh-text">{{ viewerBreakdown.premium }}</span>
              </div>
              <div v-if="viewerBreakdown.verified > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                  Verified
                </span>
                <span class="tabular-nums font-medium moh-text">{{ viewerBreakdown.verified }}</span>
              </div>
              <div v-if="viewerBreakdown.unverified > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-gray-400 shrink-0" aria-hidden="true" />
                  Unverified
                </span>
                <span class="tabular-nums font-medium moh-text">{{ viewerBreakdown.unverified }}</span>
              </div>
              <div v-if="viewerBreakdown.guest > 0" class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="inline-block h-2 w-2 rounded-full bg-gray-500/60 shrink-0" aria-hidden="true" />
                  Guests
                </span>
                <span class="tabular-nums font-medium moh-text">{{ viewerBreakdown.guest }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="viewerBreakdownLoading">
            <div class="moh-text-muted animate-pulse">Loading…</div>
          </template>
          <template v-else-if="viewerBreakdownFailed">
            <div class="moh-text-muted text-[11px]">Couldn't load breakdown.</div>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { PostViewBreakdown } from '~/types/api'
import { formatShortCount } from '~/utils/text'

const props = defineProps<{
  postId: string
  viewerCount: number
}>()

const emit = defineEmits<{
  /** Fresh breakdown total — the newest source of truth; parent syncs the row chip count. */
  (e: 'countSynced', total: number): void
}>()

const formatCountOrBlank = (n: number) => n === 0 ? ' ' : formatShortCount(n)

const { apiFetchData } = useApiClient()

const viewerCountBtnEl = ref<HTMLElement | null>(null)
const viewerBreakdownVisible = ref(false)
const viewerBreakdown = ref<PostViewBreakdown | null>(null)
const viewerBreakdownLoading = ref(false)
const viewerBreakdownFailed = ref(false)
let viewerBreakdownRequestSeq = 0

const {
  style: viewerBreakdownStyle,
  menuEl: viewerBreakdownEl,
  place: placeViewerBreakdown,
  reset: resetViewerBreakdownPosition,
} = useMenuPosition()

function placeViewerBreakdownFrom(anchorEl: HTMLElement | null) {
  if (!anchorEl) return
  placeViewerBreakdown(anchorEl, {
    align: 'end',
    gap: 6,
    menuWidth: 176,
    menuHeight: 120,
  })
}

async function onViewerCountHover(event?: Event) {
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : viewerCountBtnEl.value
  placeViewerBreakdownFrom(anchorEl)
  viewerBreakdownVisible.value = true
  placeViewerBreakdownFrom(anchorEl)
  if (viewerBreakdownLoading.value) return
  viewerBreakdownFailed.value = false
  viewerBreakdownLoading.value = true
  const requestSeq = ++viewerBreakdownRequestSeq
  try {
    const result = await apiFetchData<PostViewBreakdown>(
      `/posts/${encodeURIComponent(props.postId)}/views/breakdown?fresh=1`,
    )
    if (requestSeq === viewerBreakdownRequestSeq) {
      viewerBreakdown.value = result
      viewerBreakdownFailed.value = false
      // Fresh breakdown is the newest source of truth; let the parent sync the chip count.
      emit('countSynced', Math.max(0, Math.floor(Number(result?.total ?? 0))))
    }
  } catch {
    if (requestSeq === viewerBreakdownRequestSeq) {
      viewerBreakdownFailed.value = true
    }
  } finally {
    if (requestSeq === viewerBreakdownRequestSeq) {
      viewerBreakdownLoading.value = false
    }
  }
}

function hideViewerBreakdown() {
  viewerBreakdownVisible.value = false
  resetViewerBreakdownPosition()
}
</script>

<style scoped>
.moh-count-gutter {
  transition: opacity 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Breakdown popover: slide up and fade */
.viewer-breakdown-enter-active,
.viewer-breakdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.viewer-breakdown-enter-from,
.viewer-breakdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
