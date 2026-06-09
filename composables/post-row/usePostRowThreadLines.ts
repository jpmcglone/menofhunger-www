import type { Ref } from 'vue'

const THREAD_LINE_GAP = 4
const FALLBACK_AVATAR_H = 40

/**
 * Measures the avatar position within a post row and derives the styles for the
 * thread connector lines drawn above/below the avatar (2px, with a small gap,
 * never overextending past the row).
 */
export function usePostRowThreadLines(opts: {
  rowEl: Ref<HTMLElement | null>
  avatarEl: Ref<HTMLElement | null>
  threadLineTint: () => 'verified' | 'premium' | null | undefined
}) {
  const { rowEl, avatarEl } = opts

  const avatarTopPx = ref(0)
  const avatarHPx = ref(FALLBACK_AVATAR_H)
  let avatarRo: ResizeObserver | null = null
  let avatarResizeRaf = 0

  function recomputeAvatarMetrics() {
    if (!import.meta.client) return
    const row = rowEl.value
    const avatar = avatarEl.value
    if (!row || !avatar) return
    const rowRect = row.getBoundingClientRect()
    const avatarRect = avatar.getBoundingClientRect()
    // Clamp to avoid negative top from fractional rounding / transforms.
    avatarTopPx.value = Math.max(0, Math.round(avatarRect.top - rowRect.top))
    avatarHPx.value = Math.max(0, Math.round(avatarRect.height)) || FALLBACK_AVATAR_H
  }

  function scheduleAvatarMetricsRecompute() {
    if (!import.meta.client) return
    if (avatarResizeRaf) cancelAnimationFrame(avatarResizeRaf)
    avatarResizeRaf = requestAnimationFrame(() => {
      avatarResizeRaf = 0
      recomputeAvatarMetrics()
    })
  }

  onMounted(() => {
    scheduleAvatarMetricsRecompute()
    if (!import.meta.client) return
    try {
      avatarRo = new ResizeObserver(() => scheduleAvatarMetricsRecompute())
      if (rowEl.value) avatarRo.observe(rowEl.value)
      if (avatarEl.value) avatarRo.observe(avatarEl.value)
      window.addEventListener('resize', scheduleAvatarMetricsRecompute, { passive: true })
    } catch {
      // ignore
    }
  })

  watch(
    avatarEl,
    (el, prev) => {
      if (!import.meta.client) return
      if (!avatarRo) return
      if (prev) avatarRo.unobserve(prev)
      if (el) {
        avatarRo.observe(el)
        scheduleAvatarMetricsRecompute()
      }
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    if (avatarResizeRaf) cancelAnimationFrame(avatarResizeRaf)
    avatarResizeRaf = 0
    try {
      window.removeEventListener('resize', scheduleAvatarMetricsRecompute)
    } catch {
      // ignore
    }
    if (avatarRo) {
      try {
        if (rowEl.value) avatarRo.unobserve(rowEl.value)
        if (avatarEl.value) avatarRo.unobserve(avatarEl.value)
        avatarRo.disconnect()
      } catch {
        // ignore
      } finally {
        avatarRo = null
      }
    }
  })

  // When showThreadLineAboveAvatar: line should end THREAD_LINE_GAP px above the avatar.
  const threadLineAboveOverlayStyle = computed(() => ({ top: '0' }))
  const threadLineAboveOverlayHeight = computed(() => `${Math.max(0, avatarTopPx.value - THREAD_LINE_GAP)}px`)
  const threadLineAboveStyle = computed(() => {
    const base = { height: threadLineAboveOverlayHeight.value }
    const tint = opts.threadLineTint()
    if (tint === 'verified') return { ...base, backgroundColor: 'var(--moh-verified)' }
    if (tint === 'premium') return { ...base, backgroundColor: 'var(--moh-premium)' }
    return base
  })
  const threadLineBelowStyle = computed(() => {
    const tint = opts.threadLineTint()
    if (tint === 'verified') return { backgroundColor: 'var(--moh-verified)' }
    if (tint === 'premium') return { backgroundColor: 'var(--moh-premium)' }
    return undefined
  })
  // Line below starts (avatar bottom + gap), based on measured avatar position.
  const threadLineBelowOverlayStyle = computed(() => {
    const top = avatarTopPx.value + avatarHPx.value + THREAD_LINE_GAP
    return { top: `${top}px`, bottom: '0' }
  })

  return {
    threadLineAboveOverlayStyle,
    threadLineAboveStyle,
    threadLineBelowOverlayStyle,
    threadLineBelowStyle,
  }
}
