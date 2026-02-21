<template>
  <div class="min-w-0">
    <div class="flex items-center gap-2 min-w-0">
      <div :class="['font-semibold truncate text-gray-900 dark:text-gray-50', nameClass]">
        {{ displayName }}
      </div>
      <AppVerifiedBadge
        :status="verifiedStatus"
        :premium="user.premium ?? undefined"
        :premium-plus="user.premiumPlus ?? undefined"
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
type VerifiedStatus = 'none' | 'identity' | 'manual'
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

const verifiedStatus = computed((): VerifiedStatus | null | undefined => {
  const s = props.user.verifiedStatus
  if (s === null || s === undefined) return s
  return s === 'none' || s === 'identity' || s === 'manual' ? s : undefined
})

const displayName = computed(() => props.user.name || props.user.username || 'User')
const handle = computed(() => (props.user.username ? `@${props.user.username}` : '@—'))
</script>
