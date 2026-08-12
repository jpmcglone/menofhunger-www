<template>
  <div
    class="space-idle relative w-full h-full overflow-hidden rounded-xl select-none"
    role="img"
    aria-label="Space is idle"
  >
    <!-- Soft charcoal base + warm radial wash -->
    <div class="space-idle-base absolute inset-0" aria-hidden="true" />

    <!-- Slowly drifting film grain -->
    <div class="space-idle-grain absolute inset-0 pointer-events-none" aria-hidden="true" />

    <!-- Breathing hearth glow behind the fire -->
    <div class="space-idle-hearth absolute inset-0 pointer-events-none" aria-hidden="true" />

    <!-- Rising kindle / embers -->
    <div class="space-idle-embers absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <span
        v-for="ember in embers"
        :key="ember.id"
        class="space-idle-ember"
        :style="emberStyle(ember)"
      />
    </div>

    <div class="relative z-10 flex h-full min-h-[12rem] items-center justify-center px-4">
      <div class="text-center">
        <div class="space-idle-fire relative mx-auto inline-flex items-center justify-center">
          <span class="space-idle-fire-halo" aria-hidden="true" />
          <Icon
            name="tabler:campfire"
            class="space-idle-fire-icon relative text-[48px]"
            aria-hidden="true"
          />
        </div>
        <p class="space-idle-caption mt-3 text-sm">Space is idle</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Calm idle canvas for Spaces in NONE mode.
 * Pure CSS ambiance (grain, glow, rising embers) — no RAF / third-party libs.
 * Ember layout is deterministic so SSR and client first paint match.
 */

type Ember = {
  id: number
  left: number
  size: number
  delay: number
  duration: number
  drift: number
  opacity: number
}

/** Fixed kindle layout — calm, sparse, never random. */
const embers: Ember[] = [
  { id: 1, left: 46, size: 2.5, delay: 0, duration: 5.2, drift: -10, opacity: 0.75 },
  { id: 2, left: 52, size: 2, delay: 0.8, duration: 6.1, drift: 12, opacity: 0.55 },
  { id: 3, left: 49, size: 1.5, delay: 1.6, duration: 4.8, drift: 4, opacity: 0.65 },
  { id: 4, left: 44, size: 2, delay: 2.4, duration: 5.8, drift: -16, opacity: 0.45 },
  { id: 5, left: 55, size: 1.75, delay: 3.1, duration: 6.4, drift: 18, opacity: 0.5 },
  { id: 6, left: 48, size: 1.25, delay: 0.4, duration: 7.0, drift: -6, opacity: 0.4 },
  { id: 7, left: 51, size: 2.25, delay: 4.0, duration: 5.5, drift: 8, opacity: 0.7 },
  { id: 8, left: 42, size: 1.5, delay: 2.0, duration: 6.8, drift: -20, opacity: 0.35 },
  { id: 9, left: 57, size: 1.5, delay: 3.6, duration: 5.0, drift: 14, opacity: 0.4 },
  { id: 10, left: 47, size: 1.75, delay: 5.2, duration: 6.2, drift: -8, opacity: 0.55 },
  { id: 11, left: 53, size: 1.25, delay: 1.2, duration: 7.4, drift: 10, opacity: 0.35 },
  { id: 12, left: 50, size: 2, delay: 4.6, duration: 5.6, drift: -4, opacity: 0.6 },
]

function emberStyle(ember: Ember): Record<string, string> {
  return {
    left: `${ember.left}%`,
    width: `${ember.size}px`,
    height: `${ember.size}px`,
    animationDelay: `${ember.delay}s`,
    animationDuration: `${ember.duration}s`,
    '--ember-drift': `${ember.drift}px`,
    '--ember-opacity': String(ember.opacity),
  }
}
</script>

<style scoped>
.space-idle {
  background: #0c0a09;
}

.space-idle-base {
  background:
    radial-gradient(ellipse 70% 55% at 50% 62%, rgba(180, 83, 9, 0.22) 0%, transparent 62%),
    radial-gradient(ellipse 90% 70% at 50% 100%, rgba(69, 26, 3, 0.45) 0%, transparent 55%),
    radial-gradient(ellipse 120% 80% at 50% 0%, rgba(24, 24, 27, 0.9) 0%, transparent 60%),
    #0c0a09;
}

/* Film grain: oversized SVG noise, stepped drift for a living texture */
.space-idle-grain {
  inset: -40%;
  width: 180%;
  height: 180%;
  opacity: 0.09;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  animation: space-idle-grain 9s steps(8) infinite;
}

.space-idle-hearth {
  background:
    radial-gradient(circle at 50% 56%, rgba(251, 146, 60, 0.18) 0%, rgba(234, 88, 12, 0.08) 28%, transparent 52%);
  animation: space-idle-hearth 4.5s ease-in-out infinite;
}

.space-idle-ember {
  position: absolute;
  bottom: 42%;
  border-radius: 9999px;
  background: radial-gradient(circle, #fdba74 0%, #f97316 45%, #ea580c 100%);
  box-shadow: 0 0 6px 1px rgba(251, 146, 60, 0.55);
  transform: translate3d(0, 0, 0);
  animation-name: space-idle-ember;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

.space-idle-fire {
  width: 4.5rem;
  height: 4.5rem;
}

.space-idle-fire-halo {
  position: absolute;
  inset: -18%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.35) 0%, rgba(234, 88, 12, 0.12) 45%, transparent 70%);
  filter: blur(6px);
  animation: space-idle-halo 3.2s ease-in-out infinite;
}

.space-idle-fire-icon {
  color: #fb923c;
  filter:
    drop-shadow(0 0 10px rgba(251, 146, 60, 0.55))
    drop-shadow(0 0 22px rgba(234, 88, 12, 0.35));
  animation: space-idle-icon 3.2s ease-in-out infinite;
  transform-origin: center bottom;
}

.space-idle-caption {
  color: rgba(212, 212, 216, 0.55);
  letter-spacing: 0.01em;
}

@keyframes space-idle-grain {
  0% {
    transform: translate3d(0, 0, 0);
  }
  25% {
    transform: translate3d(-2.5%, 1.5%, 0);
  }
  50% {
    transform: translate3d(1.5%, -2%, 0);
  }
  75% {
    transform: translate3d(-1%, -1.5%, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes space-idle-hearth {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes space-idle-halo {
  0%,
  100% {
    opacity: 0.65;
    transform: scale(0.96);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}

@keyframes space-idle-icon {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}

@keyframes space-idle-ember {
  0% {
    transform: translate3d(0, 8px, 0) scale(1);
    opacity: 0;
  }
  12% {
    opacity: var(--ember-opacity, 0.6);
  }
  70% {
    opacity: calc(var(--ember-opacity, 0.6) * 0.85);
  }
  100% {
    transform: translate3d(var(--ember-drift, 0px), -88px, 0) scale(0.35);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .space-idle-grain,
  .space-idle-hearth,
  .space-idle-fire-halo,
  .space-idle-fire-icon,
  .space-idle-ember {
    animation: none !important;
  }

  .space-idle-ember {
    display: none;
  }

  .space-idle-fire-icon {
    filter:
      drop-shadow(0 0 10px rgba(251, 146, 60, 0.55))
      drop-shadow(0 0 22px rgba(234, 88, 12, 0.35));
  }

  .space-idle-hearth {
    opacity: 0.85;
  }
}
</style>
