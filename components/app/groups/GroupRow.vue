<template>
  <NuxtLink :to="linkTo" class="moh-focus moh-surface-hover flex min-h-[72px] items-center gap-3 rounded-xl px-3 py-3" :aria-current="selected ? 'page' : undefined" :class="selected ? 'bg-[var(--moh-surface-2)]' : ''" @click="$emit('navigate')">
    <AppGroupsGroupAvatar :name="group.name" :src="group.avatarImageUrl" />
    <span class="min-w-0 flex-1"><span class="block text-[15px] font-semibold moh-text">{{ group.name }}</span><span class="mt-1 block text-[13px] moh-text-muted">{{ summary }}</span></span>
    <AppActivityBadge v-if="channelBadge.personalCount || channelBadge.hasUnread" :count="channelBadge.personalCount" :has-unread="channelBadge.hasUnread" count-label="channel mentions" unread-label="Unread channels" />
    <AppActivityBadge v-if="newCount" :count="newCount" count-label="new posts" />
    <Icon :name="selected ? 'tabler:check' : 'tabler:chevron-right'" class="shrink-0 text-base moh-text-muted" aria-hidden="true" />
  </NuxtLink>
</template>
<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
const props = defineProps<{ group: CommunityGroupShell; newCount?: number; selected?: boolean; to?: string }>()
const { badgeFor } = useGroupChannelBadges()
const { lastDestination } = useGroupDestinations()
const channelBadge = computed(() => badgeFor(props.group.id))
const linkTo = computed(() => props.to ?? lastDestination(props.group))
const summary = computed(() => {
  const parts: string[] = []
  if (channelBadge.value.personalCount) parts.push(`${channelBadge.value.personalCount} ${channelBadge.value.personalCount === 1 ? 'mention' : 'mentions'}`)
  else if (channelBadge.value.hasUnread) parts.push('New in channels')
  if (props.newCount) parts.push(`${props.newCount} new ${props.newCount === 1 ? 'post' : 'posts'}`)
  return parts.join(' · ') || 'You’re up to date'
})
defineEmits<{ navigate: [] }>()
</script>
