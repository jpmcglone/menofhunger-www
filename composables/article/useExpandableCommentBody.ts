import { computed, nextTick, ref, type Ref } from 'vue'

const COLLAPSED_MAX = '5.6em'

/** Animated "Show more / Show less" clamp for long comment bodies. */
export function useExpandableCommentBody(body: Ref<string>) {
  const expanded = ref(false)
  const bodyWrapEl = ref<HTMLElement | null>(null)
  const bodyTextEl = ref<HTMLElement | null>(null)
  const expandedHeight = ref('none')

  const isTruncatable = computed(() => body.value.length > 280 || (body.value.match(/\n/g)?.length ?? 0) >= 4)

  const bodyClampStyle = computed(() => {
    if (!isTruncatable.value) return undefined
    if (expanded.value) return { maxHeight: expandedHeight.value }
    return { maxHeight: COLLAPSED_MAX }
  })

  async function toggleExpand() {
    if (!expanded.value) {
      const textEl = bodyTextEl.value
      if (textEl) expandedHeight.value = `${textEl.scrollHeight}px`
      expanded.value = true
      // After transition finishes, remove the constraint so content reflows naturally
      const wrap = bodyWrapEl.value
      if (wrap) {
        const onEnd = () => {
          wrap.removeEventListener('transitionend', onEnd)
          if (expanded.value) expandedHeight.value = 'none'
        }
        wrap.addEventListener('transitionend', onEnd)
      }
    } else {
      // Snap to the measured pixel height so the CSS transition has a concrete start value,
      // then wait for Vue to flush it before collapsing (which animates to the em value).
      const textEl = bodyTextEl.value
      if (textEl) expandedHeight.value = `${textEl.scrollHeight}px`
      await nextTick()
      // Force reflow so the browser paints the explicit height before the transition starts
      void bodyWrapEl.value?.offsetHeight
      expanded.value = false
    }
  }

  return { expanded, bodyWrapEl, bodyTextEl, isTruncatable, bodyClampStyle, toggleExpand }
}
