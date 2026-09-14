<template>
  <div class="space-y-5">
    <div class="flex items-center gap-3"><AppGroupsGroupAvatar :name="shell.name" :src="shell.avatarImageUrl" :size="56" /><div><h2 class="moh-h2">{{ shell.name }}</h2><p class="moh-meta">{{ shell.memberCount }} members</p></div></div>
    <p class="text-sm whitespace-pre-wrap moh-text">{{ shell.description }}</p>
    <div><p class="text-xs font-semibold uppercase moh-text-muted">Reading access</p><p class="mt-2 text-sm font-semibold">{{ shell.joinPolicy === 'open' ? 'Verified members can read' : 'Members only' }}</p><p class="mt-1 moh-meta">{{ shell.joinPolicy === 'open' ? 'Verified members can read posts and replies. Join the group to post.' : 'Only members can read posts and replies.' }}</p></div>
    <div><p class="text-xs font-semibold uppercase moh-text-muted">Joining</p><p class="mt-2 text-sm font-semibold">{{ shell.joinPolicy === 'open' ? 'Open to verified members' : 'Approval required' }}</p></div>
    <div v-if="shell.rules && shell.viewerMembership?.status === 'active'"><h3 class="text-sm font-semibold">Group rules</h3><p class="mt-2 whitespace-pre-wrap text-sm moh-text-muted">{{ shell.rules }}</p></div>
    <div class="moh-divide border-y moh-border">
      <NuxtLink v-if="shell.viewerMembership?.status === 'active'" :to="`/g/${encodeURIComponent(shell.slug)}/members`" class="moh-focus flex min-h-11 items-center justify-between text-sm">View members<Icon name="tabler:chevron-right" /></NuxtLink>
      <button v-if="shell.avatarImageUrl" type="button" class="moh-focus flex min-h-11 w-full items-center justify-between text-sm" @click="$emit('avatar', $event)">View group avatar<Icon name="tabler:chevron-right" /></button>
      <button v-if="shell.coverImageUrl" type="button" class="moh-focus flex min-h-11 w-full items-center justify-between text-sm" @click="$emit('banner', $event)">View group banner<Icon name="tabler:chevron-right" /></button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
defineProps<{ shell: CommunityGroupShell }>()
defineEmits<{ avatar: [event: MouseEvent]; banner: [event: MouseEvent] }>()
</script>
