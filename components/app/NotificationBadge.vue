<template>
  <!-- Only render when count is strictly greater than 0. Never show badge for zero. -->
  <span
    v-if="badgeCount > 0"
    :class="[
      'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center',
      toneClass,
    ]"
  >
    {{ badgeText }}
  </span>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { notificationUndeliveredCount } = usePresence()

/** Numeric count, clamped to non-negative integer. Source of truth for visibility. */
const badgeCount = computed(() => {
  const raw = notificationUndeliveredCount.value
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
})

/** Display string: never "0" (component doesn't render when badgeCount is 0). */
const badgeText = computed(() =>
  badgeCount.value >= 99 ? '99+' : String(badgeCount.value),
)

const toneClass = computed(() => {
  const u = user.value
  if (u?.premium) return 'moh-notif-badge-premium'
  if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'moh-notif-badge-verified'
  return 'moh-notif-badge-normal'
})
</script>
