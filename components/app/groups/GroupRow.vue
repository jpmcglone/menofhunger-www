<template>
  <NuxtLink :to="`/g/${encodeURIComponent(group.slug)}`" class="moh-focus moh-surface-hover flex min-h-[72px] items-center gap-3 rounded-xl px-3 py-3" :aria-current="selected ? 'page' : undefined" :class="selected ? 'bg-[var(--moh-surface-2)]' : ''" @click="$emit('navigate')">
    <AppGroupsGroupAvatar :name="group.name" :src="group.avatarImageUrl" />
    <span class="min-w-0 flex-1"><span class="block text-[15px] font-semibold moh-text">{{ group.name }}</span><span class="mt-1 block text-[13px] moh-text-muted">{{ newCount ? `${newCount} new ${newCount === 1 ? 'post' : 'posts'}` : 'You’re up to date' }}</span></span>
    <Icon :name="selected ? 'tabler:check' : 'tabler:chevron-right'" class="shrink-0 text-base moh-text-muted" aria-hidden="true" />
  </NuxtLink>
</template>
<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
defineProps<{ group: CommunityGroupShell; newCount?: number; selected?: boolean }>()
defineEmits<{ navigate: [] }>()
</script>
