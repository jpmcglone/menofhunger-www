import type { MembersUsMapProps, MembersUsMapEmits } from './members-us-map-types'
import { useElementSize } from '@vueuse/core'
import type { MembersMapState, MembersMapUser } from '~/types/api'
import type { PackedAvatar } from '~/components/app/map/StateAvatarPack.vue'
import { CALLOUT_MARGIN, CALLOUT_STATES, fitCrop, packAvatars, placeLabels, pointInRings, spreadVertically, stateFill, unionBBox, US_MAP_VIEWBOX, type BBox, type Point } from '~/utils/members-map'
import { usStateShapes } from '~/utils/us-state-shapes'

export type Label = { code: string; name: string; count: number; online: number; preview: MembersMapUser[]; big: boolean; x: number; y: number }

/**
 * Script state for `AppMapMembersUsMap`: map sizing, zoom and crop, state labels and
 * callouts, avatar packing, selection, and live moments.
 */
export function useMembersUsMap(props: MembersUsMapProps, emit: MembersUsMapEmits) {
  const MIN_HEIGHT = 240
  const MAX_HEIGHT = 640
  const AUTO_SELECT_SCALE = 2.4
  const MAX_PACKED = 240
  const MIN_AVATAR_PX = 22
  const MAX_AVATAR_PX = 64
  const AVATAR_FILL = 0.84
  const BIG_LABELS = 6

  const { isOnline } = usePresence()

  const wrapEl = ref<HTMLElement | null>(null)
  const svgEl = ref<SVGSVGElement | null>(null)
  const { width: wrapWidth } = useElementSize(wrapEl)
  const width = computed(() => Math.max(1, Math.round(wrapWidth.value)))

  const allShapes = usStateShapes()
  const byCode = computed(() => new Map(props.states.map((s) => [s.state, s])))

  const countFor = (s: MembersMapState | undefined) => (s ? (props.onlineOnly ? s.onlineCount : s.memberCount) : 0)
  const maxCount = computed(() => Math.max(1, ...props.states.map(countFor)))

  /** The crop follows where members live, not the online filter, so toggling never reshapes the map. */
  const crop = computed<BBox>(() => {
    const occupied = props.states.filter((s) => s.memberCount > 0).map((s) => allShapes.get(s.state)).filter((s) => !!s)
    const union = unionBBox(occupied.map((s) => s.bbox))
    if (!union) return US_MAP_VIEWBOX
    const withCallouts = occupied.some((s) => CALLOUT_STATES.has(s.code))
      ? { ...union, width: Math.max(union.width, US_MAP_VIEWBOX.x + US_MAP_VIEWBOX.width - union.x) + CALLOUT_MARGIN }
      : union
    return fitCrop(withCallouts)
  })

  const height = computed(() => {
    const ideal = width.value * (crop.value.height / crop.value.width)
    return Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, ideal)))
  })

  const base = computed(() => {
    const c = crop.value
    const k0 = Math.min(width.value / c.width, height.value / c.height)
    return {
      k0,
      ox: (width.value - c.width * k0) / 2 - c.x * k0,
      oy: (height.value - c.height * k0) / 2 - c.y * k0,
    }
  })

  const size = computed(() => ({ width: width.value, height: height.value }))
  const { transform, zoomTo, zoomBy, reset, maxScale } = useSvgPanZoom(svgEl, { size, onGestureEnd })

  function toScreen([px, py]: Point): Point {
    const b = base.value
    const t = transform.value
    return [t.x + t.k * (b.ox + px * b.k0), t.y + t.k * (b.oy + py * b.k0)]
  }

  function toMap([sx, sy]: Point): Point {
    const b = base.value
    const t = transform.value
    return [((sx - t.x) / t.k - b.ox) / b.k0, ((sy - t.y) / t.k - b.oy) / b.k0]
  }

  const shapes = computed(() =>
    [...allShapes.values()].map((shape) => {
      const s = byCode.value.get(shape.code)
      const count = countFor(s)
      const members = s?.memberCount ?? 0
      return {
        code: shape.code,
        name: s?.stateDisplay ?? shape.name,
        path: shape.path,
        members,
        fill: members > 0 ? stateFill(count, maxCount.value) : 'var(--moh-surface-1)',
      }
    }),
  )

  const showCallouts = computed(() => transform.value.k < 1.2)

  const ranked = computed(() =>
    props.states
      .map((s) => ({ s, count: countFor(s) }))
      .filter((r) => r.count > 0 && allShapes.has(r.s.state))
      .sort((a, b) => b.count - a.count),
  )

  const labels = computed<Label[]>(() => {
    const roomy = width.value >= 640
    const entries = ranked.value
      .filter((r) => !(showCallouts.value && CALLOUT_STATES.has(r.s.state)))
      .map((r, i) => {
        const [x, y] = toScreen(allShapes.get(r.s.state)!.anchor)
        const preview = props.onlineOnly ? r.s.preview.filter((u) => isOnline(u.id)) : r.s.preview
        const big = roomy && i < BIG_LABELS && preview.length > 0
        const online = r.s.onlineCount
        const w = (big ? 46 : 0) + String(r.count).length * 8 + (!props.onlineOnly && online ? 22 : 0) + (props.viewerState === r.s.state ? 28 : 0) + 18
        return { r, x, y, big, preview: preview.slice(0, 3), w, h: big ? 28 : 22 }
      })
      .filter((e) => e.x > 0 && e.y > 0 && e.x < width.value && e.y < height.value)
    const placed = new Map(
      placeLabels(entries.map((e) => ({ id: e.r.s.state, x: e.x, y: e.y, width: e.w, height: e.h }))).map((p) => [p.id, p]),
    )
    return entries
      .filter((e) => placed.has(e.r.s.state))
      .map((e) => {
        const p = placed.get(e.r.s.state)!
        return {
          code: e.r.s.state,
          name: e.r.s.stateDisplay,
          count: e.r.count,
          online: e.r.s.onlineCount,
          preview: e.preview,
          big: e.big,
          x: p.x,
          y: p.y,
        }
      })
  })

  const callouts = computed(() => {
    if (props.selected || !showCallouts.value) return []
    const items = ranked.value
      .filter((r) => CALLOUT_STATES.has(r.s.state))
      .map((r) => {
        const [ax, ay] = toScreen(allShapes.get(r.s.state)!.anchor)
        return { r, ax, ay }
      })
      .sort((a, b) => a.ay - b.ay)
    const ys = spreadVertically(items.map((i) => i.ay), 28)
    const x = width.value - 8 - 76
    return items.map((i, idx) => ({
      code: i.r.s.state,
      name: i.r.s.stateDisplay,
      count: i.r.count,
      online: i.r.s.onlineCount,
      ax: i.ax,
      ay: i.ay,
      x,
      y: Math.min(height.value - 14, ys[idx]!),
    }))
  })

  const selectedShape = computed(() => (props.selected ? allShapes.get(props.selected) ?? null : null))

  const fitTransform = computed(() => {
    const shape = selectedShape.value
    if (!shape) return { x: 0, y: 0, k: 1 }
    const b = base.value
    const bx = b.ox + shape.bbox.x * b.k0
    const by = b.oy + shape.bbox.y * b.k0
    const bw = Math.max(1, shape.bbox.width * b.k0)
    const bh = Math.max(1, shape.bbox.height * b.k0)
    const pad = 0.1
    const k = Math.min((width.value * (1 - pad * 2)) / bw, (height.value * (1 - pad * 2)) / bh, maxScale)
    return { x: width.value / 2 - k * (bx + bw / 2), y: height.value / 2 - k * (by + bh / 2), k }
  })

  const packPoints = computed(() => {
    const shape = selectedShape.value
    if (!shape || !props.members.length) return { points: [] as Point[], step: 0 }
    const pxPerUnit = base.value.k0 * fitTransform.value.k
    return packAvatars(shape.rings, Math.min(props.members.length, MAX_PACKED), {
      minStep: MIN_AVATAR_PX / (AVATAR_FILL * pxPerUnit),
      maxStep: MAX_AVATAR_PX / (AVATAR_FILL * pxPerUnit),
    })
  })

  const packed = computed<{ avatars: PackedAvatar[]; overflow: { x: number; y: number; count: number } | null }>(() => {
    const shape = selectedShape.value
    const { points, step } = packPoints.value
    if (!shape) return { avatars: [], overflow: null }
    const px = step * AVATAR_FILL * base.value.k0 * transform.value.k
    const avatars = points.map((p, i) => {
      const [x, y] = toScreen(p)
      const user = props.members[i]!
      return { user, x, y, size: px, online: isOnline(user.id) }
    })
    const extra = props.memberTotal - avatars.length
    if (extra <= 0) return { avatars, overflow: null }
    const [cx, bottom] = toScreen([shape.bbox.x + shape.bbox.width / 2, shape.bbox.y + shape.bbox.height])
    return { avatars, overflow: { x: cx, y: Math.min(height.value - 36, bottom + 8), count: extra } }
  })

  /** Moments drawn at their state's label anchor; "no location" moments show in the header instead. */
  const momentMarks = computed(() =>
    (props.moments ?? []).flatMap((m) => {
      if (!m.state) return []
      const shape = allShapes.get(m.state)
      if (!shape) return []
      if (props.selected && props.selected !== m.state) return []
      const [x, y] = toScreen(shape.anchor)
      return [{ ...m, x, y }]
    }),
  )

  const selectedCount = computed(() => {
    const shape = selectedShape.value
    const s = props.selected ? byCode.value.get(props.selected) : undefined
    if (!shape || !s) return null
    const [x, y] = toScreen(shape.anchor)
    return { x, y, name: s.stateDisplay, members: s.memberCount, online: s.onlineCount }
  })

  const ariaLabel = computed(() => {
    const n = props.states.length
    return `Map of where members live across ${n} ${n === 1 ? 'state' : 'states'}`
  })

  function onStateClick(code: string, members: number) {
    if (members <= 0) return
    emit('select', props.selected === code ? null : code)
  }

  function onZoomOut() {
    if (props.selected && transform.value.k <= fitTransform.value.k * 1.05) {
      emit('select', null)
      return
    }
    zoomBy(1 / 1.6)
  }

  function onGestureEnd(t: { x: number; y: number; k: number }) {
    if (!props.selected && t.k >= AUTO_SELECT_SCALE) {
      const center = toMap([width.value / 2, height.value / 2])
      const hit = [...allShapes.values()].find((s) => pointInRings(center[0], center[1], s.rings))
      if (hit && (byCode.value.get(hit.code)?.memberCount ?? 0) > 0) emit('select', hit.code)
      return
    }
    if (props.selected && t.k < fitTransform.value.k * 0.5) emit('select', null)
  }

  watch(
    () => props.selected,
    (code) => {
      if (code) zoomTo(fitTransform.value)
      else reset()
    },
  )

  watch(size, () => {
    if (props.selected) zoomTo(fitTransform.value, 0)
    else reset(0)
  })

  onMounted(() => {
    if (props.selected) zoomTo(fitTransform.value, 0)
  })

  return {
    isOnline,
    wrapEl,
    svgEl,
    width,
    height,
    base,
    transform,
    zoomBy,
    shapes,
    labels,
    callouts,
    packed,
    momentMarks,
    selectedCount,
    ariaLabel,
    onStateClick,
    onZoomOut,
  }
}
