<template>
  <span class="inline-flex shrink-0">
    <Transition name="moh-badge-pop">
      <span
        v-if="view !== 'hidden'"
        :key="'badge'"
        :class="[tone, 'moh-activity-badge', view === 'count' ? 'is-count' : 'is-dot', bumping ? 'is-bumping' : '', ring ? 'ring-2 ring-[var(--moh-bg)]' : '']"
        :aria-label="label"
        role="status"
      >
        <span class="moh-activity-badge__content" :class="contentVisible ? '' : 'is-hidden'" aria-hidden="true">
          <AppAnimatedCount :value="shownCount" :format="n => n > 99 ? '99+' : String(n)" />
        </span>
      </span>
    </Transition>
  </span>
</template>

<script setup lang="ts">
import { activityBadge } from '~/utils/activity-badge'

type View = 'hidden' | 'count' | 'dot'

const props = withDefaults(defineProps<{ count?: number; hasUnread?: boolean; countLabel?: string; unreadLabel?: string; ring?: boolean }>(), {
  ring: false,
  count: 0,
  hasUnread: false,
  countLabel: 'pending updates',
  unreadLabel: 'Unread notifications',
})

const tone = useActivityBadgeTone()
const target = computed(() => activityBadge(props.count, props.hasUnread))

const initial = target.value
const view = ref<View>(initial.kind)
const contentVisible = ref(initial.kind === 'count')
const shownCount = ref(initial.kind === 'count' ? initial.count : 0)
const bumping = ref(false)

const label = computed(() => (view.value === 'count' ? `${shownCount.value} ${props.countLabel}` : props.unreadLabel))

const SETTLE_MS = 150
let timers: ReturnType<typeof setTimeout>[] = []
function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}
function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function reducedMotion() {
  return import.meta.client && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function bump() {
  if (reducedMotion()) return
  bumping.value = false
  requestAnimationFrame(() => {
    bumping.value = true
    later(() => { bumping.value = false }, 320)
  })
}

function settle(next: ReturnType<typeof activityBadge>) {
  clearTimers()
  const instant = !import.meta.client || reducedMotion()
  if (next.kind === 'hidden') {
    contentVisible.value = false
    view.value = 'hidden'
    return
  }
  if (next.kind === 'count') {
    const wasCount = view.value === 'count'
    const increased = wasCount && next.count > shownCount.value
    shownCount.value = next.count
    if (wasCount) {
      contentVisible.value = true
      if (increased) bump()
      return
    }
    if (view.value === 'hidden' || instant) {
      view.value = 'count'
      contentVisible.value = true
      return
    }
    // dot → count: the circle grows into the pill, then the number appears.
    view.value = 'count'
    later(() => { contentVisible.value = true }, SETTLE_MS)
    return
  }
  // next is a dot
  if (view.value === 'count' && !instant) {
    // count → dot: the number leaves first, then the circle shrinks into place.
    contentVisible.value = false
    later(() => { view.value = 'dot' }, SETTLE_MS)
    return
  }
  contentVisible.value = false
  view.value = 'dot'
}

watch(target, settle)
onBeforeUnmount(clearTimers)
</script>

<style scoped>
.moh-activity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  overflow: hidden;
  transition:
    min-width 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    height 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    padding 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.moh-activity-badge.is-count {
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
}
.moh-activity-badge.is-dot {
  min-width: 10px;
  height: 10px;
  padding: 0;
}
.moh-activity-badge__content {
  display: inline-flex;
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.moh-activity-badge__content.is-hidden {
  opacity: 0;
  transform: scale(0.6);
}
.moh-activity-badge.is-bumping {
  animation: moh-badge-bump 300ms cubic-bezier(0.3, 1.6, 0.5, 1);
}

.moh-badge-pop-enter-active {
  transition: opacity 180ms ease-out, transform 220ms cubic-bezier(0.3, 1.5, 0.5, 1);
}
.moh-badge-pop-leave-active {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
}
.moh-badge-pop-enter-from,
.moh-badge-pop-leave-to {
  opacity: 0;
  transform: scale(0.4);
}

@keyframes moh-badge-bump {
  0% { transform: scale(1); }
  45% { transform: scale(1.22); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .moh-activity-badge,
  .moh-activity-badge__content,
  .moh-badge-pop-enter-active,
  .moh-badge-pop-leave-active {
    transition: opacity 120ms linear;
  }
  .moh-activity-badge.is-bumping { animation: none; }
  .moh-badge-pop-enter-from,
  .moh-badge-pop-leave-to { transform: none; }
}
</style>
