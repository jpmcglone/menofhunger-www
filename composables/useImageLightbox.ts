type LightboxKind = 'avatar' | 'banner' | 'media'
type Rect = { left: number; top: number; width: number; height: number }
type MediaStartMode = 'origin' | 'fitAnchored'

export type LightboxMediaItem = {
  url: string
  kind: 'image' | 'video'
  posterUrl?: string | null
  durationSeconds?: number | null
  width?: number | null
  height?: number | null
}

let requestId = 0

export function useImageLightbox() {
  // Singleton state (shared across the app).
  const visible = useState<boolean>('moh.lightbox.visible', () => false)
  const backdropVisible = useState<boolean>('moh.lightbox.backdropVisible', () => false)
  const src = useState<string | null>('moh.lightbox.src', () => null)
  const alt = useState<string>('moh.lightbox.alt', () => 'Image')
  const kind = useState<LightboxKind>('moh.lightbox.kind', () => 'banner')
  // For media: controls whether the original thumbnail(s) are hidden underneath the lightbox copy.
  const hideOrigin = useState<boolean>('moh.lightbox.hideOrigin', () => false)
  const mediaStartMode = useState<MediaStartMode>('moh.lightbox.mediaStartMode', () => 'fitAnchored')

  const items = useState<string[]>('moh.lightbox.items', () => [])
  const mediaItems = useState<LightboxMediaItem[]>('moh.lightbox.mediaItems', () => [])
  const mediaPostId = useState<string | null>('moh.lightbox.mediaPostId', () => null)
  const index = useState<number>('moh.lightbox.index', () => 0)
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

  function calcMediaStartRectFromOrigin(o: Rect, aspect: number): Rect {
    const ox = o.left + o.width / 2
    const oy = o.top + o.height / 2
    const a = aspect && Number.isFinite(aspect) ? aspect : 1

    // Option A: keep the clicked box width, compute height for aspect-fit.
    const wFromWidth = Math.max(1, o.width)
    const hFromWidth = Math.max(1, wFromWidth / a)

    // Option B: keep the clicked box height, compute width for aspect-fit.
    const hFromHeight = Math.max(1, o.height)
    const wFromHeight = Math.max(1, hFromHeight * a)

    // Choose the one that changes the other dimension less (looks more natural).
    const relDeltaH = Math.abs(hFromWidth - o.height) / Math.max(1, o.height)
    const relDeltaW = Math.abs(wFromHeight - o.width) / Math.max(1, o.width)
    const useWidth = relDeltaH <= relDeltaW

    const width = useWidth ? wFromWidth : wFromHeight
    const height = useWidth ? hFromWidth : hFromHeight
    return { left: ox - width / 2, top: oy - height / 2, width, height }
  }

  function calcMediaStartRect(o: Rect, aspect: number): Rect {
    return mediaStartMode.value === 'origin' ? { ...o } : calcMediaStartRectFromOrigin(o, aspect)
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

    // For post media, avoid non-uniform scaling (it can look like "stretching").
    // Instead, keep transform identity and animate the fixed box rect (left/top/width/height).
    if (kind.value === 'media') {
      // Start from either the exact clicked rect, or an aspect-fit anchored rect.
      target.value = calcMediaStartRect(o, mediaAspect.value || 1)
      transform.value = 'translate(0px, 0px) scale(1, 1)'
      transition.value = 'none'
      borderRadius.value = targetRadius(kind.value)

      requestAnimationFrame(() => {
        backdropVisible.value = true
        transition.value =
          'left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1)'
        target.value = calcTargetRect(mediaAspect.value || 1, 'media')
      })
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

    if (kind.value === 'media') {
      backdropVisible.value = false
      transform.value = 'translate(0px, 0px) scale(1, 1)'
      transition.value =
        'left 220ms cubic-bezier(0.4, 0, 0.2, 1), top 220ms cubic-bezier(0.4, 0, 0.2, 1), width 220ms cubic-bezier(0.4, 0, 0.2, 1), height 220ms cubic-bezier(0.4, 0, 0.2, 1)'
      // Return to the same start rect, then unmount + reveal original.
      target.value = calcMediaStartRect(o, mediaAspect.value || 1)
      borderRadius.value = initialRadius(kind.value)
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

  async function openFromEvent(
    e: MouseEvent,
    url: string | null,
    label: string,
    k: LightboxKind,
    opts?: { mediaStartMode?: MediaStartMode },
  ) {
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
    // When opening from a gallery (openGalleryFromMediaItems), items/mediaItems/index are already set; don't overwrite or the wrong item (e.g. video) won't show.
    if (k !== 'media' || (mediaItems.value.length <= 1 && items.value.length <= 1)) {
      items.value = [url]
      index.value = 0
    }
    hideOrigin.value = k === 'media'
    mediaStartMode.value = k === 'media' ? (opts?.mediaStartMode ?? 'fitAnchored') : 'fitAnchored'
    origin.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    target.value = null

    visible.value = true
    backdropVisible.value = false
    setScrollLocked(true)

    const list = mediaItems.value
    const cur = list[index.value]
    const aspect =
      k === 'media' && cur?.kind === 'video' && typeof cur.width === 'number' && typeof cur.height === 'number' && cur.height > 0
        ? cur.width / cur.height
        : await preloadAspect(url)
    if (myId !== requestId) return
    mediaAspect.value = aspect

    // For media, we animate rect changes starting from origin (no scale distortion).
    // For other kinds, we can keep the existing transform-based zoom.
    target.value = k === 'media' ? calcMediaStartRect(origin.value as Rect, aspect) : calcTargetRect(aspect, k)
    borderRadius.value = initialRadius(k)
    transition.value = 'none'
    transform.value = 'translate(0px, 0px) scale(1, 1)'

    await nextTick()
    startOpenAnimation()
  }

  async function openGalleryFromEvent(
    e: MouseEvent,
    urls: string[],
    startIndex: number,
    label: string,
    opts?: { mediaStartMode?: MediaStartMode },
  ) {
    if (!import.meta.client) return
    const xs = (urls ?? []).map((u) => (u ?? '').trim()).filter(Boolean)
    if (xs.length === 0) return
    const i = Number.isFinite(startIndex) ? Math.max(0, Math.min(xs.length - 1, Math.floor(startIndex))) : 0
    items.value = xs
    mediaItems.value = xs.map((url) => ({ url, kind: 'image' as const }))
    mediaPostId.value = null
    index.value = i
    await openFromEvent(e, xs[i] ?? null, label, 'media', opts)
  }

  async function openGalleryFromMediaItems(
    e: MouseEvent,
    itemsList: LightboxMediaItem[],
    startIndex: number,
    label: string,
    opts?: { mediaStartMode?: MediaStartMode; postId?: string | null },
  ) {
    if (!import.meta.client) return
    const list = (itemsList ?? []).filter((m) => m?.url?.trim())
    if (list.length === 0) return
    const i = Number.isFinite(startIndex) ? Math.max(0, Math.min(list.length - 1, Math.floor(startIndex))) : 0
    const url = list[i]?.url ?? null
    if (!url) return
    items.value = list.map((m) => m.url)
    mediaItems.value = list
    mediaPostId.value = opts?.postId ?? null
    index.value = i
    const { activate, stopAll } = useEmbeddedVideoManager()
    if (list[i]?.kind === 'video' && opts?.postId) activate(opts.postId)
    else stopAll()
    await openFromEvent(e, url, label, 'media', opts)
  }

  const currentMediaItem = computed((): LightboxMediaItem | null => {
    const list = mediaItems.value
    const i = index.value
    if (!list?.length || i < 0 || i >= list.length) return null
    return list[i] ?? null
  })

  const canPrev = computed(() => index.value > 0)
  const canNext = computed(() => index.value < (items.value.length || 0) - 1)

  async function setIndex(next: number) {
    const xs = items.value
    if (!xs.length) return
    const i = Math.max(0, Math.min(xs.length - 1, Math.floor(next)))
    if (i === index.value) return

    requestId += 1
    const myId = requestId

    const list = mediaItems.value
    const nextItem = list[i]
    const { activate, stopAll } = useEmbeddedVideoManager()
    if (nextItem?.kind === 'video' && mediaPostId.value) activate(mediaPostId.value)
    else stopAll()

    index.value = i
    const url = xs[i] ?? null
    src.value = url
    if (!url) return
    const aspect =
      nextItem?.kind === 'video' &&
      typeof nextItem.width === 'number' &&
      typeof nextItem.height === 'number' &&
      nextItem.height > 0
        ? nextItem.width / nextItem.height
        : await preloadAspect(url)
    if (myId !== requestId) return
    mediaAspect.value = aspect
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
    // Reveal the original thumbnail(s) immediately (no animation), then let the lightbox copy disappear.
    hideOrigin.value = false
    startCloseAnimation()
  }

  function finalizeClose() {
    visible.value = false
    backdropVisible.value = false
    src.value = null
    alt.value = 'Image'
    items.value = []
    index.value = 0
    mediaAspect.value = 1
    hideOrigin.value = false
    mediaStartMode.value = 'fitAnchored'
    origin.value = null
    target.value = null
    transition.value = 'none'
    transform.value = 'translate(0px, 0px) scale(1, 1)'
    borderRadius.value = '0px'
    setScrollLocked(false)
  }

  function onTransitionEnd(e: TransitionEvent) {
    if (!import.meta.client) return
    if (kind.value === 'media') {
      // Media animates left/top/width/height (no transform scaling).
      if (e.propertyName !== 'width') return
      if (backdropVisible.value) return
      finalizeClose()
      return
    }

    if (e.propertyName !== 'transform') return
    if (backdropVisible.value) {
      // Opening finished.
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
    mediaItems,
    currentMediaItem,
    index,
    canPrev,
    canNext,
    target,
    imageStyle,
    hideOrigin,
    openFromEvent,
    openGalleryFromEvent,
    openGalleryFromMediaItems,
    prev,
    next,
    close,
    onTransitionEnd,
  }
}

