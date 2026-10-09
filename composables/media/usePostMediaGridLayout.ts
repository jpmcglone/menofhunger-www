import type { ComputedRef, CSSProperties } from 'vue'
import type { PostMedia } from '~/types/api'

/** Single-media sizing (measured EXIF-safe dimensions) and multi-up grid layout for `AppPostMediaGrid`. */
export function usePostMediaGridLayout(props: { compact: boolean }, items: ComputedRef<PostMedia[]>) {
  // Compact: 10rem height, max 6:4 (w:h) → max-width 15rem. Default: 36rem max height for single/grid media.
  const FIXED_HEIGHT_REM = computed(() => (props.compact ? 10 : 36))
  const MAX_WIDTH_REM = computed(() => (props.compact ? 15 : undefined))
  const MAX_RATIO = 6 / 4 // width/height max

  const single = computed(() => (items.value.length === 1 ? (items.value[0] ?? null) : null))
  const singleIsImageLike = computed(() => Boolean(single.value && single.value.kind !== 'video'))

  // Some phone photos rely on EXIF orientation. The browser displays them rotated, but our stored
  // width/height metadata can be the unrotated pixel matrix. That mismatch makes the layout box
  // wide while the rendered image is tall (centered letterbox). Measure the real decoded dimensions
  // on the client and prefer them for layout.
  const singleMeasured = ref<{ w: number; h: number } | null>(null)
  let singleMeasureReq = 0
  watch(
    () => (singleIsImageLike.value ? (single.value?.url ?? null) : null),
    (url) => {
      if (!import.meta.client) return
      singleMeasured.value = null
      const u = (url ?? '').trim()
      if (!u) return
      singleMeasureReq += 1
      const req = singleMeasureReq
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (req !== singleMeasureReq) return
        const w = Number(img.naturalWidth || 0)
        const h = Number(img.naturalHeight || 0)
        if (w > 0 && h > 0) singleMeasured.value = { w, h }
      }
      img.onerror = () => {
        if (req !== singleMeasureReq) return
        singleMeasured.value = null
      }
      img.src = u
    },
    { immediate: true },
  )

  const singleWidth = computed(() => {
    if (singleIsImageLike.value && singleMeasured.value?.w) return singleMeasured.value.w
    return typeof single.value?.width === 'number' ? single.value.width : null
  })
  const singleHeight = computed(() => {
    if (singleIsImageLike.value && singleMeasured.value?.h) return singleMeasured.value.h
    return typeof single.value?.height === 'number' ? single.value.height : null
  })
  const singleAspectRatio = computed(() => {
    const w = singleWidth.value ?? 0
    const h = singleHeight.value ?? 0
    if (!w || !h) return null
    return w / h
  })
  // Treat only truly-wide images as "full width"; otherwise keep fixed height and let width shrink.
  const singleIsVeryWide = computed(() => {
    const r = singleAspectRatio.value
    if (!r) return false
    return r >= 1.6
  })

  const singleBoxStyle = computed<CSSProperties>(() => {
    const w = singleWidth.value
    const h = singleHeight.value
    const heightRem = FIXED_HEIGHT_REM.value
    const maxW = MAX_WIDTH_REM.value
    if (!w || !h) {
      // No dimensions: use max-height so it can shrink on small viewports; default aspect keeps a reasonable size.
      const base: CSSProperties = {
        aspectRatio: '16 / 9',
        maxHeight: `${heightRem}rem`,
        width: '100%',
      }
      if (maxW != null) base.maxWidth = `${maxW}rem`
      return base
    }
    // Max height so media can be smaller on narrow viewports; width from aspect ratio, capped when compact.
    const aspectRatio = w / h
    const cappedRatio = maxW != null ? Math.min(aspectRatio, MAX_RATIO) : aspectRatio
    const pxCap = singleIsImageLike.value ? `${w}px` : undefined
    const heightCap = singleIsImageLike.value ? `${h}px` : undefined
    return {
      aspectRatio: `${w} / ${h}`,
      maxHeight: heightCap ? `min(${heightRem}rem, ${heightCap})` : `${heightRem}rem`,
      width: maxW != null
        ? `min(${heightRem * cappedRatio}rem, ${maxW}rem, 100%${pxCap ? `, ${pxCap}` : ''})`
        : `min(${heightRem * aspectRatio}rem, 100%${pxCap ? `, ${pxCap}` : ''})`,
    }
  })
  const singleBoxClass = computed(() => {
    if (!single.value) return ''
    // moh-media-frame on the consuming element supplies radius + clipping.
    // We just hand back the width/shrink behaviour appropriate for the box's
    // aspect ratio.
    if (!singleWidth.value || !singleHeight.value) return 'relative w-full shrink-0'
    if (singleIsVeryWide.value) return 'relative w-full shrink-0'
    return 'relative shrink-0'
  })

  const gridClass = computed(() => {
    const n = items.value.length
    if (n === 2) return 'grid-cols-2'
    if (n === 3) return 'grid-cols-2 grid-rows-2'
    if (n === 4) return 'grid-cols-2 grid-rows-2'
    return 'grid-cols-2'
  })

  // Max height so grid can be smaller on narrow viewports; aspect-ratio gives height from width (2/1 = two rows of square-ish cells).
  const gridStyle = computed(() => ({
    height: '100%',
  }))

  const gridWrapperStyle = computed<CSSProperties>(() => {
    const heightRem = FIXED_HEIGHT_REM.value
    const maxW = MAX_WIDTH_REM.value
    const base: CSSProperties = {
      aspectRatio: '2 / 1',
      maxHeight: `${heightRem}rem`,
      width: '100%',
    }
    if (maxW != null) base.maxWidth = `${maxW}rem`
    return base
  })

  function itemClass(idx: number): string {
    const n = items.value.length
    // 3-up: left tile spans both rows; right tiles stack.
    if (n === 3 && idx === 0) return 'row-span-2'
    return ''
  }

  return {
    FIXED_HEIGHT_REM,
    MAX_WIDTH_REM,
    single,
    singleWidth,
    singleHeight,
    singleBoxStyle,
    singleBoxClass,
    gridClass,
    gridStyle,
    gridWrapperStyle,
    itemClass,
  }
}
