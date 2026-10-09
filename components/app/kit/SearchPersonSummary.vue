<template>
  <AppUserAvatar
    :user="{ id: user.id, username: user.username, avatarUrl: user.avatarUrl, avatarVideo: user.avatarVideo, isOrganization: user.isOrganization }"
    size-class="h-8 w-8"
    :show-presence="false"
    class="shrink-0"
  />
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-1 min-w-0">
      <span class="font-medium text-sm moh-text truncate">{{ user.name?.trim() || `@${user.username}` }}</span>
      <AppVerifiedBadge
        v-if="user.verifiedStatus && user.verifiedStatus !== 'none'"
        :status="user.verifiedStatus"
        :premium="user.premium"
        :premium-plus="user.premiumPlus"
        :is-organization="user.isOrganization"
      />
    </div>
    <div class="text-xs moh-text-muted truncate">@{{ user.username }}</div>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser, RecentSearchUser } from '~/types/api'

/** Avatar plus name, badge, and handle for a user in a search suggestion row. Renders into the parent's flex row. */
defineProps<{ user: FollowListUser | RecentSearchUser }>()
</script>
