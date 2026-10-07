<template>
  <AppActivityBadge
    class="pointer-events-none absolute -right-0.5 -top-0.5"
    :count="count"
    :has-unread="hasDot"
    :count-label="countLabel"
    :unread-label="dotLabel"
  />
</template>

<script setup lang="ts">
/**
 * Board and Articles are their own surfaces, not part of the Notifications bell.
 * Board shows a count of direct mentions, or a dot when there is other unread activity.
 */
const props = defineProps<{ section: string }>()

const { notificationNavUnread } = usePresence()

const isBoard = computed(() => props.section === 'board')
const count = computed(() => (isBoard.value ? notificationNavUnread.value.boardMentions : 0))
const hasDot = computed(() => (isBoard.value ? notificationNavUnread.value.board : notificationNavUnread.value.articles) > 0)
const countLabel = 'Board mentions'
const dotLabel = computed(() => (isBoard.value ? 'Unread Board activity' : 'Unread article activity'))
</script>
