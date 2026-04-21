<template>
  <!-- Wrapper is inline-grid so the leaving + entering values stack in the same
       grid cell. This preserves the parent's text-alignment automatically (works
       for left/center/right-aligned count gutters) and means we don't need to
       toggle `position: absolute` mid-transition. -->
  <span class="moh-animated-count tabular-nums" :aria-label="ariaLabel">
    <Transition :name="dir">
      <span :key="display" class="moh-animated-count__inner" aria-hidden="true">{{ display }}</span>
    </Transition>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * AppAnimatedCount
 * ----------------
 * Slide-in/out for in-place numeric updates (boost/comment/repost/bookmark/view counts,
 * unread badges, online count, etc). Direction is inferred from the underlying
 * `value` delta:
 *   - increased → new value enters from below, old slides up   (the "ratchet" feel)
 *   - decreased → new value enters from above, old slides down
 *
 * The animation only fires when the rendered `display` string actually changes,
 * so noisy intra-bucket updates that get clamped by the formatter (e.g. 1234 → 1235
 * both rounding to "1.2k") never trigger a slide. This is what keeps the effect
 * from feeling busy on heavy realtime traffic.
 *
 * Initial mount does NOT animate (Vue's <Transition> only animates on enter/leave
 * for subsequent key changes, not first paint, unless `appear` is set).
 *
 * Honors `prefers-reduced-motion`.
 */

const props = withDefaults(
  defineProps<{
    /** The raw numeric value. Used to infer direction. */
    value: number
    /** Optional formatter (e.g. `formatShortCount` for "1.2k"). Defaults to String(value). */
    format?: (n: number) => string
    /** Optional aria-label override. If omitted, the wrapper is unlabeled and
        the inner display is exposed to screen readers via natural text. */
    ariaLabel?: string
  }>(),
  {}
)

const display = computed(() => (props.format ? props.format(props.value) : String(props.value)))

const dir = ref<'up' | 'down'>('up')
let prevValue = props.value

watch(display, () => {
  const cur = props.value
  if (cur > prevValue) dir.value = 'up'
  else if (cur < prevValue) dir.value = 'down'
  prevValue = cur
})
</script>

<style scoped>
.moh-animated-count {
  display: inline-grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  /* Hide the slide-in/out behind the box edge so the digits don't bleed
     into surrounding chrome (icon, button border, etc). */
  overflow: hidden;
  vertical-align: baseline;
  /* Reserve one line of vertical room so the wrapper doesn't visually collapse
     while a `display: contents` Transition wrapper momentarily has zero kids. */
  line-height: inherit;
}

.moh-animated-count__inner {
  /* Both leaving + entering children share grid cell 1/1 so they perfectly
     overlap during the cross-fade-and-slide. */
  grid-column: 1;
  grid-row: 1;
  /* Inherit text-align from parent (works for w-6 left-aligned boost gutters
     AND right-aligned bookmark gutters with no per-call config). */
  text-align: inherit;
  white-space: nowrap;
}

/* "up" = the underlying value went UP. New value enters from BELOW, old
   leaves UPWARD. Same intuition as a flipping scoreboard / X's count. */
.up-enter-active,
.up-leave-active,
.down-enter-active,
.down-leave-active {
  transition:
    transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 180ms ease-out;
  will-change: transform, opacity;
}

.up-enter-from {
  transform: translateY(70%);
  opacity: 0;
}
.up-leave-to {
  transform: translateY(-70%);
  opacity: 0;
}
.down-enter-from {
  transform: translateY(-70%);
  opacity: 0;
}
.down-leave-to {
  transform: translateY(70%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .up-enter-active,
  .up-leave-active,
  .down-enter-active,
  .down-leave-active {
    transition: none;
  }
  .up-enter-from,
  .up-leave-to,
  .down-enter-from,
  .down-leave-to {
    transform: none;
    opacity: 1;
  }
}
</style>
