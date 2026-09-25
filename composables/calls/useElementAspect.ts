import type { Ref } from 'vue'

/** Live width/height of an element (0 until measured). Follows rotation and window resizes. */
export function useElementAspect(el: Ref<HTMLElement | null>) {
  const aspect = ref(0)
  let observer: ResizeObserver | null = null

  function measure(target: Element, width: number, height: number) {
    if (target !== el.value) return
    aspect.value = width > 0 && height > 0 ? width / height : 0
  }

  watch(
    el,
    (next) => {
      observer?.disconnect()
      observer = null
      if (!next || typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) measure(entry.target, entry.contentRect.width, entry.contentRect.height)
      })
      observer.observe(next)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return aspect
}
