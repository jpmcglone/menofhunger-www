type InViewOnceOptions = {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
}

function parseFirstPx(rootMargin: string | undefined): number {
  const raw = (rootMargin ?? '').trim()
  if (!raw) return 0
  const first = raw.split(/\s+/)[0] ?? ''
  const n = Number.parseFloat(first)
  return Number.isFinite(n) ? n : 0
}

function isInViewport(el: HTMLElement, marginPx: number): boolean {
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight || 0
  // Treat margin as extra "preload" distance above/below viewport.
  return r.bottom >= -marginPx && r.top <= vh + marginPx
}

/**
 * One-way "in view" flag:
 * - becomes true once the element is near/in viewport
 * - never flips back to false
 *
 * Includes an immediate post-mount measurement so newly-inserted DOM that is already on-screen
 * doesn't have to wait for an IntersectionObserver tick/scroll.
 */
export function useInViewOnce(elRef: Ref<HTMLElement | null>, opts: InViewOnceOptions = {}) {
  const inView = ref(false)
  let obs: IntersectionObserver | null = null

  onMounted(async () => {
    if (!import.meta.client) return
    await nextTick()
    const el = elRef.value
    if (!el) return

    const marginPx = parseFirstPx(opts.rootMargin)
    if (isInViewport(el, marginPx)) {
      inView.value = true
      return
    }

    obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e) return
        if (e.isIntersecting) {
          inView.value = true
          obs?.disconnect()
          obs = null
        }
      },
      {
        root: opts.root ?? null,
        rootMargin: opts.rootMargin ?? '0px',
        threshold: opts.threshold ?? 0,
      },
    )
    obs.observe(el)
  })

  onBeforeUnmount(() => {
    obs?.disconnect()
    obs = null
  })

  return { inView }
}

