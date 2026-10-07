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
        <span :key="l.count" class="moh-count-pop font-bold tabular-nums moh-text" :class="l.big ? 'text-[13px]' : 'text-xs'">{{ l.count }}</span>
        <span v-if="!onlineOnly && l.online > 0" :key="`o${l.online}`" class="moh-count-pop flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-[var(--moh-online)]">
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

    <!-- Live moments: joins, people coming online, going offline. -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        v-for="m in momentMarks"
        :key="m.id"
        class="absolute"
        :style="{ left: `${m.x}px`, top: `${m.y}px` }"
      >
        <span class="moh-moment-ring" :class="`moh-moment-ring--${m.kind}`" />
        <span v-if="m.kind !== 'offline'" class="moh-moment-ring moh-moment-ring--late" :class="`moh-moment-ring--${m.kind}`" />
        <span v-if="m.kind === 'join'" class="moh-moment-float moh-moment-float--join">+{{ m.count }}</span>
        <span v-else-if="m.kind === 'online' && m.count > 1" class="moh-moment-float moh-moment-float--online">+{{ m.count }}</span>
        <span v-else-if="m.kind === 'offline'" class="moh-moment-float moh-moment-float--offline">&minus;{{ m.count }}</span>
      </div>
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
import type { MembersUsMapProps, MembersUsMapEmits } from '../../../composables/map/members-us-map-types'
import { useMembersUsMap } from '~/composables/map/useMembersUsMap'

const props = defineProps<MembersUsMapProps>()

const emit = defineEmits<MembersUsMapEmits>()

const {
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
} = useMembersUsMap(props, emit)
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

/* ─── Live moments ─────────────────────────────────────────────── */
.moh-moment-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 9999px;
  border: 2px solid currentColor;
  opacity: 0;
  animation: moh-moment-ring 1500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.moh-moment-ring--late {
  animation-delay: 220ms;
}

.moh-moment-ring--join {
  color: #e6b45e;
  width: 56px;
  height: 56px;
  margin: -28px 0 0 -28px;
  border-width: 2.5px;
  animation-duration: 1900ms;
}

.moh-moment-ring--online {
  color: var(--moh-online);
}

.moh-moment-ring--offline {
  color: var(--moh-text-soft);
  border-width: 1.5px;
  animation-duration: 1200ms;
}

@keyframes moh-moment-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.4);
  }
  100% {
    opacity: 0;
    transform: scale(3.2);
  }
}

.moh-moment-float {
  position: absolute;
  left: 14px;
  top: -30px;
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  animation: moh-moment-float 1800ms ease-out forwards;
}

.moh-moment-float--join {
  background: #e6b45e;
  color: #1a1408;
}

.moh-moment-float--online {
  background: color-mix(in srgb, var(--moh-online) 18%, var(--moh-surface-2));
  color: var(--moh-online);
}

.moh-moment-float--offline {
  color: var(--moh-text-soft);
  animation-duration: 1400ms;
}

@keyframes moh-moment-float {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.85);
  }
  18% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-22px);
  }
}

.moh-count-pop {
  display: inline-flex;
  animation: moh-count-pop 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes moh-count-pop {
  0% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .moh-moment-ring,
  .moh-moment-float,
  .moh-count-pop {
    animation: none;
    opacity: 0;
  }

  .moh-count-pop {
    opacity: 1;
  }
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
