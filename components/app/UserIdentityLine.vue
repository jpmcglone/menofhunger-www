<template>
  <div class="min-w-0">
    <div class="flex items-center gap-2 min-w-0">
      <div :class="['font-semibold truncate text-gray-900 dark:text-gray-50', nameClass]">
        {{ displayName }}
      </div>
      <AppVerifiedBadge
        :status="user.verifiedStatus"
        :premium="user.premium"
        :premium-plus="user.premiumPlus"
        :is-organization="Boolean(user.isOrganization)"
        :steward-badge-enabled="user.stewardBadgeEnabled ?? true"
        :size="badgeSize"
      />
      <slot name="after-name" />
    </div>
    <div :class="['truncate text-gray-600 dark:text-gray-300', handleClass]">
      {{ handle }}
    </div>
  </div>
</template>

<script setup lang="ts">
type UserLike = {
  name?: string | null
  username?: string | null
  verifiedStatus?: string | null
  premium?: boolean | null
  premiumPlus?: boolean | null
  isOrganization?: boolean | null
  stewardBadgeEnabled?: boolean | null
}

const props = withDefaults(
  defineProps<{
    user: UserLike
    nameClass?: string
    handleClass?: string
    badgeSize?: 'xs' | 'sm' | 'md'
  }>(),
  {
    nameClass: 'text-sm',
    handleClass: 'text-xs',
    badgeSize: 'sm',
  },
)

const displayName = computed(() => props.user.name || props.user.username || 'User')
const handle = computed(() => (props.user.username ? `@${props.user.username}` : '@—'))
</script>
