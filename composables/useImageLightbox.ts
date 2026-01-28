type LightboxKind = 'avatar' | 'banner'
type Rect = { left: number; top: number; width: number; height: number }

export function useImageLightbox() {
  const visible = ref(false)
  const backdropVisible = ref(false)
  const src = ref<string | null>(null)
  const alt = ref('Image')
  const kind = ref<LightboxKind>('banner')

  const origin = ref<Rect | null>(null)
  const target = ref<Rect | null>(null)
  const transform = ref('translate(0px, 0px) scale(1, 1)')
  const borderRadius = ref('0px')
  const transition = ref('none')

  let requestId = 0

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

  function calcTargetRect(aspect: number) {
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
    origin.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    target.value = null

    visible.value = true
    backdropVisible.value = false
    setScrollLocked(true)

    const aspect = await preloadAspect(url)
    if (myId !== requestId) return

    target.value = calcTargetRect(aspect)
    borderRadius.value = initialRadius(k)
    transition.value = 'none'

    await nextTick()
    startOpenAnimation()
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
    if (backdropVisible.value) return // opening finished
    finalizeClose()
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
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
    target,
    imageStyle,
    openFromEvent,
    close,
    onTransitionEnd,
  }
}

