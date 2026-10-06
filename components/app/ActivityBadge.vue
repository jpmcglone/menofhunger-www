<template>
  <span v-if="state.kind !== 'hidden'" :class="[tone, state.kind === 'count' ? 'inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums' : 'inline-block size-2.5 rounded-full']" :aria-label="state.kind === 'count' ? `${state.count} ${countLabel}` : unreadLabel" role="status">
    <AppAnimatedCount v-if="state.kind === 'count'" :value="state.count" :format="n => n > 99 ? '99+' : String(n)" />
  </span>
</template>
<script setup lang="ts">
import { activityBadge } from '~/utils/activity-badge'
const props = withDefaults(defineProps<{ count?: number; hasUnread?: boolean; countLabel?: string; unreadLabel?: string }>(), { count: 0, hasUnread: false, countLabel: 'pending updates', unreadLabel: 'Unread notifications' })
const state = computed(() => activityBadge(props.count, props.hasUnread))
const tone = useActivityBadgeTone()
</script>
