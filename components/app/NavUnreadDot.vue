<template>
  <span
    v-if="show"
    :class="['pointer-events-none absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--moh-bg)]', toneClass]"
    aria-hidden="true"
  />
  <span v-if="show" class="sr-only">{{ srLabel }}</span>
</template>

<script setup lang="ts">
/**
 * Unread-notification dot for sections whose notifications also count in the bell
 * (Board, Articles). A dot, not a number, so the same activity isn't counted twice.
 */
const props = defineProps<{ section: string }>()

const { notificationNavUnread } = usePresence()
const { toneClass } = useNotificationsBadge()

const show = computed(() => {
  const counts = notificationNavUnread.value
  return (props.section === 'board' ? counts.board : counts.articles) > 0
})
const srLabel = computed(() => (props.section === 'board' ? 'Unread Board activity' : 'Unread article activity'))
</script>
