type LightboxKind = 'avatar' | 'banner' | 'media'
type Rect = { left: number; top: number; width: number; height: number }

let requestId = 0

export function useImageLightbox() {
  // Singleton state (shared across the app).
  const visible = useState<boolean>('moh.lightbox.visible', () => false)
  const backdropVisible = useState<boolean>('moh.lightbox.backdropVisible', () => false)
  const src = useState<string | null>('moh.lightbox.src', () => null)
  const alt = useState<string>('moh.lightbox.alt', () => 'Image')
  const kind = useState<LightboxKind>('moh.lightbox.kind', () => 'banner')

  const items = useState<string[]>('moh.lightbox.items', () => [])
  const index = useState<number>('moh.lightbox.index', () => 0)
  const mediaPhase = useState<'fill' | 'fit'>('moh.lightbox.mediaPhase', () => 'fit')
  const mediaAspect = useState<number>('moh.lightbox.mediaAspect', () => 1)

  const origin = useState<Rect | null>('moh.lightbox.origin', () => null)
  const target = useState<Rect | null>('moh.lightbox.target', () => null)
  const transform = useState<string>('moh.lightbox.transform', () => 'translate(0px, 0px) scale(1, 1)')
  const borderRadius = useState<string>('moh.lightbox.borderRadius', () => '0px')
  const transition = useState<string>('moh.lightbox.transition', () => 'none')

  function setScrollLocked(locked: boolean) {
    if (!import.meta.client) return
    document.documentElement.style.overflow = locked ? 'hidden' : ''
    document.body.style.overflow = locked ? 'hidden' : ''
  }

  function initialRadius(k: LightboxKind) {
    return k === 'avatar' ? '9999px' : '0px'
  }

  function targetRadius(k: LightboxKind) {
    // Avatars should remain circular even in full-screen.
    return k === 'avatar' ? '9999px' : '0px'
  }

  function calcTargetRect(aspect: number, k: LightboxKind) {
    const pad = 16 // px
    const vw = window.innerWidth
    const vh = window.innerHeight
    const maxW = Math.max(1, vw - pad * 2)
    const maxH = Math.max(1, vh - pad * 2)

    // Media opens as aspect-fill (cropped), then settles to aspect-fit.
    if (k === 'media' && mediaPhase.value === 'fill') {
      return { left: pad, top: pad, width: maxW, height: maxH }
    }

    let width = maxW
    let height = width / aspect
    if (height > maxH) {
      height = maxH
      width = height * aspect
    }

    const left = (vw - width) / 2
    const top = (vh - height) / 2
    return { left, top, width, height }
  }

  async function preloadAspect(url: string): Promise<number> {
    if (!import.meta.client) return 1
    return await new Promise((resolve) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        const w = Number(img.naturalWidth || 0)
        const h = Number(img.naturalHeight || 0)
        resolve(w && h ? w / h : 1)
      }
      img.onerror = () => resolve(1)
      img.src = url
    })
  }

  function startOpenAnimation() {
    if (!import.meta.client) return
    const o = origin.value
    const t = target.value
    if (!o || !t) return

    const ox = o.left + o.width / 2
    const oy = o.top + o.height / 2
    const tx = t.left + t.width / 2
    const ty = t.top + t.height / 2

    const dx = ox - tx
    const dy = oy - ty
    const sx = o.width / t.width
    const sy = o.height / t.height

    transform.value = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
    transition.value = 'none'

    requestAnimationFrame(() => {
      backdropVisible.value = true
      transition.value =
        'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1)'
      transform.value = 'translate(0px, 0px) scale(1, 1)'
      borderRadius.value = targetRadius(kind.value)
    })
  }

  function startCloseAnimation() {
    if (!import.meta.client) return
    const o = origin.value
    const t = target.value
    if (!o || !t) {
      finalizeClose()
      return
    }

    const ox = o.left + o.width / 2
    const oy = o.top + o.height / 2
    const tx = t.left + t.width / 2
    const ty = t.top + t.height / 2

    const dx = ox - tx
    const dy = oy - ty
    const sx = o.width / t.width
    const sy = o.height / t.height

    backdropVisible.value = false
    transition.value =
      'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 220ms cubic-bezier(0.4, 0, 0.2, 1)'
    transform.value = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
    borderRadius.value = initialRadius(kind.value)
  }

  async function openFromEvent(e: MouseEvent, url: string | null, label: string, k: LightboxKind) {
    if (!import.meta.client) return
    if (!url) return

    const el = e.currentTarget as HTMLElement | null
    const rect = el?.getBoundingClientRect?.()
    if (!rect) return

    requestId += 1
    const myId = requestId

    kind.value = k
    alt.value = label
    src.value = url
    items.value = [url]
    index.value = 0
    mediaPhase.value = k === 'media' ? 'fill' : 'fit'
    origin.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    target.value = null

    visible.value = true
    backdropVisible.value = false
    setScrollLocked(true)

    const aspect = await preloadAspect(url)
    if (myId !== requestId) return
    mediaAspect.value = aspect

    target.value = calcTargetRect(aspect, k)
    borderRadius.value = initialRadius(k)
    transition.value = 'none'

    await nextTick()
    startOpenAnimation()
  }

  async function openGalleryFromEvent(e: MouseEvent, urls: string[], startIndex: number, label: string) {
    if (!import.meta.client) return
    const xs = (urls ?? []).map((u) => (u ?? '').trim()).filter(Boolean)
    if (xs.length === 0) return
    const i = Number.isFinite(startIndex) ? Math.max(0, Math.min(xs.length - 1, Math.floor(startIndex))) : 0
    items.value = xs
    index.value = i
    await openFromEvent(e, xs[i] ?? null, label, 'media')
  }

  const canPrev = computed(() => index.value > 0)
  const canNext = computed(() => index.value < (items.value.length || 0) - 1)

  async function setIndex(next: number) {
    const xs = items.value
    if (!xs.length) return
    const i = Math.max(0, Math.min(xs.length - 1, Math.floor(next)))
    if (i === index.value) return

    requestId += 1
    const myId = requestId

    index.value = i
    const url = xs[i] ?? null
    src.value = url
    if (!url) return
    const aspect = await preloadAspect(url)
    if (myId !== requestId) return
    mediaAspect.value = aspect
    if (kind.value === 'media') mediaPhase.value = 'fit'
    target.value = calcTargetRect(aspect, kind.value)
    // Keep it simple: no fancy crossfade, just re-layout to new aspect.
    transform.value = 'translate(0px, 0px) scale(1, 1)'
    transition.value = 'none'
    borderRadius.value = targetRadius(kind.value)
  }

  function prev() {
    if (!canPrev.value) return
    void setIndex(index.value - 1)
  }

  function next() {
    if (!canNext.value) return
    void setIndex(index.value + 1)
  }

  function close() {
    requestId += 1
    if (!visible.value) return
    startCloseAnimation()
  }

  function finalizeClose() {
    visible.value = false
    backdropVisible.value = false
    src.value = null
    alt.value = 'Image'
    items.value = []
    index.value = 0
    mediaPhase.value = 'fit'
    mediaAspect.value = 1
    origin.value = null
    target.value = null
    transition.value = 'none'
    transform.value = 'translate(0px, 0px) scale(1, 1)'
    borderRadius.value = '0px'
    setScrollLocked(false)
  }

  function onTransitionEnd(e: TransitionEvent) {
    if (!import.meta.client) return
    if (e.propertyName !== 'transform') return
    if (backdropVisible.value) {
      // Opening finished.
      if (kind.value === 'media' && mediaPhase.value === 'fill') {
        // Animate the box from fill -> fit, and crossfade cover -> contain in the component.
        requestAnimationFrame(() => {
          transition.value =
            'left 260ms cubic-bezier(0.22, 1, 0.36, 1), top 260ms cubic-bezier(0.22, 1, 0.36, 1), width 260ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms cubic-bezier(0.22, 1, 0.36, 1)'
          mediaPhase.value = 'fit'
          target.value = calcTargetRect(mediaAspect.value || 1, 'media')
        })
      }
      return
    }
    finalizeClose()
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (!visible.value) return
    if (kind.value !== 'media') return
    if ((items.value?.length ?? 0) < 2) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prev()
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
      return
    }
  }

  watch(
    visible,
    (open) => {
      if (!import.meta.client) return
      if (open) window.addEventListener('keydown', onKeydown)
      else window.removeEventListener('keydown', onKeydown)
    },
    { flush: 'post' }
  )

  onBeforeUnmount(() => {
    finalizeClose()
    if (!import.meta.client) return
    window.removeEventListener('keydown', onKeydown)
  })

  const imageStyle = computed(() => {
    const t = target.value
    if (!t) return {}
    return {
      position: 'fixed',
      left: `${t.left}px`,
      top: `${t.top}px`,
      width: `${t.width}px`,
      height: `${t.height}px`,
      transform: transform.value,
      transition: transition.value,
      borderRadius: borderRadius.value,
    } as const
  })

  return {
    visible,
    backdropVisible,
    src,
    alt,
    kind,
    items,
    index,
    canPrev,
    canNext,
    mediaPhase,
    target,
    imageStyle,
    openFromEvent,
    openGalleryFromEvent,
    prev,
    next,
    close,
    onTransitionEnd,
  }
}

