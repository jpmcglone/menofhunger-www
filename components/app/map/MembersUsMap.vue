<template>
  <div ref="wrapEl" class="relative w-full select-none" :style="{ height: `${height}px` }">
    <svg
      ref="svgEl"
      :width="width"
      :height="height"
      class="block"
      :class="transform.k > 1.01 || selected ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-pan-y'"
      role="img"
      :aria-label="ariaLabel"
    >
      <g :transform="`translate(${transform.x},${transform.y}) scale(${transform.k})`">
        <g :transform="`translate(${base.ox},${base.oy}) scale(${base.k0})`">
          <path
            v-for="s in shapes"
            :key="s.code"
            :d="s.path"
            vector-effect="non-scaling-stroke"
            class="moh-map-state"
            :class="{
              'moh-map-state--occupied': s.members > 0,
              'moh-map-state--dim': selected && selected !== s.code,
              'moh-map-state--selected': selected === s.code,
              'moh-map-state--viewer': viewerState === s.code && !selected,
            }"
            :style="{ fill: s.fill }"
            :tabindex="s.members > 0 ? 0 : undefined"
            :role="s.members > 0 ? 'button' : undefined"
            :aria-label="s.members > 0 ? `${s.name}: ${s.members} ${s.members === 1 ? 'man' : 'men'}` : undefined"
            @click="onStateClick(s.code, s.members)"
            @keydown.enter.prevent="onStateClick(s.code, s.members)"
            @keydown.space.prevent="onStateClick(s.code, s.members)"
          >
            <title>{{ s.members > 0 ? `${s.name} · ${s.members} ${s.members === 1 ? 'man' : 'men'}` : s.name }}</title>
          </path>
        </g>
      </g>
      <g v-if="callouts.length" class="pointer-events-none">
        <line
          v-for="c in callouts"
          :key="`leader-${c.code}`"
          :x1="c.ax"
          :y1="c.ay"
          :x2="c.x - 4"
          :y2="c.y"
          class="moh-map-leader"
        />
        <circle v-for="c in callouts" :key="`dot-${c.code}`" :cx="c.ax" :cy="c.ay" r="2.5" class="moh-map-leader-dot" />
      </g>
    </svg>

    <!-- Overview labels -->
    <div v-if="!selected" class="pointer-events-none absolute inset-0">
      <button
        v-for="l in labels"
        :key="l.code"
        type="button"
        class="moh-map-pill pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
        :class="l.big ? 'h-7 pl-1 pr-2.5' : 'h-[22px] px-2'"
        :style="{ left: `${l.x}px`, top: `${l.y}px` }"
        :aria-label="`${l.name}: ${l.count} ${onlineOnly ? 'online' : l.count === 1 ? 'man' : 'men'}`"
        @click="emit('select', l.code)"
      >
        <span v-if="l.big && l.preview.length" class="flex -space-x-1.5">
          <span
            v-for="u in l.preview"
            :key="u.id"
            class="block h-5 w-5 overflow-hidden rounded-full ring-[1.5px]"
            :class="isOnline(u.id) ? 'ring-[var(--moh-online)]' : 'ring-[var(--moh-surface-2)]'"
          >
            <AppUserAvatar :user="u" size-class="h-5 w-5" :show-presence="false" :show-status="false" :enable-preview="false" />
          </span>
        </span>
        <span class="font-bold tabular-nums moh-text" :class="l.big ? 'text-[13px]' : 'text-xs'">{{ l.count }}</span>
        <span v-if="!onlineOnly && l.online > 0" class="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-[var(--moh-online)]">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />{{ l.online }}
        </span>
        <span v-if="viewerState === l.code" class="rounded-md bg-[var(--moh-brass)] px-1 text-[9px] font-bold uppercase leading-4 text-white">You</span>
      </button>

      <button
        v-for="c in callouts"
        :key="`callout-${c.code}`"
        type="button"
        class="moh-map-pill pointer-events-auto absolute h-[22px] -translate-y-1/2 px-2"
        :style="{ left: `${c.x}px`, top: `${c.y}px` }"
        :aria-label="`${c.name}: ${c.count} ${onlineOnly ? 'online' : c.count === 1 ? 'man' : 'men'}`"
        @click="emit('select', c.code)"
      >
        <span class="text-[10px] font-semibold moh-text-soft">{{ c.code }}</span>
        <span class="text-xs font-bold tabular-nums moh-text">{{ c.count }}</span>
        <span v-if="!onlineOnly && c.online > 0" class="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-[var(--moh-online)]">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />{{ c.online }}
        </span>
      </button>
    </div>

    <AppMapStateAvatarPack v-else-if="membersVisible" :avatars="packed.avatars" :overflow="packed.overflow" @show-all="emit('showAll')" />

    <!-- Counts-only viewers: the state's numbers, never faces. -->
    <div v-else-if="selectedCount" class="pointer-events-none absolute inset-0">
      <div
        class="moh-map-count absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border moh-border bg-[color-mix(in_srgb,var(--moh-surface-2)_86%,transparent)] px-6 py-4 text-center shadow-lg backdrop-blur-md"
        :style="{ left: `${selectedCount.x}px`, top: `${selectedCount.y}px` }"
      >
        <p class="text-4xl font-bold tabular-nums tracking-tight moh-text sm:text-5xl">{{ selectedCount.members.toLocaleString('en-US') }}</p>
        <p class="mt-0.5 text-sm font-medium moh-text-muted">{{ selectedCount.members === 1 ? 'man' : 'men' }} in {{ selectedCount.name }}</p>
        <p class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--moh-online)]">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--moh-online)]" aria-hidden="true" />
          {{ selectedCount.online.toLocaleString('en-US') }} online now
        </p>
      </div>
    </div>

    <div v-if="selected && membersVisible && packLoading" class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <AppLogoLoader compact />
    </div>

    <div class="absolute right-2 top-2 flex flex-col overflow-hidden rounded-xl border moh-border bg-[var(--moh-surface-2)] shadow-sm">
      <button type="button" class="flex h-9 w-9 items-center justify-center moh-text hover:bg-[var(--moh-surface-hover)]" aria-label="Zoom in" @click="zoomBy(1.6)">
        <Icon name="tabler:plus" class="h-4 w-4" aria-hidden="true" />
      </button>
      <span class="h-px bg-[var(--moh-border)]" aria-hidden="true" />
      <button type="button" class="flex h-9 w-9 items-center justify-center moh-text hover:bg-[var(--moh-surface-hover)]" aria-label="Zoom out" @click="onZoomOut">
        <Icon name="tabler:minus" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import type { MembersMapState, MembersMapUser } from '~/types/api'
import type { PackedAvatar } from '~/components/app/map/StateAvatarPack.vue'
import {
  CALLOUT_MARGIN,
  CALLOUT_STATES,
  fitCrop,
  packAvatars,
  placeLabels,
  pointInRings,
  spreadVertically,
  stateFill,
  unionBBox,
  US_MAP_VIEWBOX,
  type BBox,
  type Point,
} from '~/utils/members-map'
import { usStateShapes } from '~/utils/us-state-shapes'

const props = defineProps<{
  states: MembersMapState[]
  onlineOnly: boolean
  selected: string | null
  /** Members of the selected state, online first. */
  members: MembersMapUser[]
  /** Members in the selected state that match the current filter, loaded or not. */
  memberTotal: number
  packLoading?: boolean
  viewerState: string | null
  /** False for signed-out and unverified viewers: counts only, never faces. */
  membersVisible: boolean
}>()

const emit = defineEmits<{
  (e: 'select', code: string | null): void
  (e: 'showAll'): void
}>()

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

type Label = { code: string; name: string; count: number; online: number; preview: MembersMapUser[]; big: boolean; x: number; y: number }

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
</script>

<style scoped>
.moh-map-state {
  stroke: var(--moh-bg);
  stroke-width: 1;
  transition:
    opacity 220ms ease,
    fill 220ms ease;
}

.moh-map-state--occupied {
  cursor: pointer;
}

.moh-map-state--occupied:hover,
.moh-map-state--occupied:focus-visible {
  outline: none;
  filter: brightness(1.06);
  stroke: var(--moh-text);
  stroke-width: 1.5;
}

.moh-map-state--dim {
  opacity: 0.35;
}

.moh-map-state--selected {
  stroke: var(--moh-brass);
  stroke-width: 2;
}

.moh-map-state--viewer {
  stroke: var(--moh-brass);
  stroke-width: 1.5;
  stroke-dasharray: 3 2;
}

.moh-map-leader {
  stroke: var(--moh-text-soft);
  stroke-width: 1;
  stroke-dasharray: 2 2;
}

.moh-map-leader-dot {
  fill: var(--moh-text-soft);
}

.moh-map-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  border-radius: 9999px;
  border: 1px solid var(--moh-border);
  background: var(--moh-surface-2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
}

.moh-map-count {
  animation: moh-map-count-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) 200ms backwards;
}

@keyframes moh-map-count-in {
  from {
    opacity: 0;
    transform: translate(-50%, -40%) scale(0.92);
  }
}

@media (prefers-reduced-motion: reduce) {
  .moh-map-count {
    animation: none;
  }
}

.moh-map-pill:hover,
.moh-map-pill:focus-visible {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
}
</style>
