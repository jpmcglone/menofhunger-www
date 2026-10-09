<template>
  <div class="shrink-0 h-8 w-8 overflow-hidden bg-gray-100 dark:bg-zinc-800 flex items-center justify-center" :class="groupRoundClass">
    <img v-if="group.avatarImageUrl" :src="group.avatarImageUrl" :alt="group.name" class="h-full w-full object-cover" >
    <Icon v-else name="tabler:users-group" class="text-base moh-text-muted" aria-hidden="true" />
  </div>
  <div class="min-w-0 flex-1">
    <div class="text-sm font-medium moh-text truncate">{{ group.name }}</div>
    <div class="text-xs moh-text-muted truncate">{{ formatCount(group.memberCount) }} {{ group.memberCount === 1 ? 'member' : 'members' }}</div>
  </div>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { RecentSearchGroup } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'

/** Avatar plus name and member count for a group in a search suggestion row. Renders into the parent's flex row. */
defineProps<{ group: Pick<RecentSearchGroup, 'name' | 'avatarImageUrl' | 'memberCount'> }>()
const groupRoundClass = groupAvatarRoundClass()
</script>
