<template>
  <span class="inline-flex min-w-0 items-center gap-2 text-[15px] font-semibold leading-[22px]" :style="{ color }">
    <AppIconGlyph :name="icon" :size="20" />
    <span class="truncate">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=304-1027
import type { PostVisibility } from '~/types/api'
import { postActionVisibilityColor, visibilityTagLabel } from '~/utils/post-visibility'
import { PRIMARY_PREMIUM_ORANGE } from '~/utils/theme-tint'

const props = defineProps<{ visibility: PostVisibility; groupName?: string }>()
const label = computed(() => props.groupName || visibilityTagLabel(props.visibility) || 'Public')
const icon = computed(() => {
  if (props.groupName) return 'group'
  if (props.visibility === 'verifiedOnly') return 'badgeVerified'
  if (props.visibility === 'premiumOnly') return 'badgePremium'
  if (props.visibility === 'onlyMe') return 'private'
  return 'globe'
})
const color = computed(() => {
  if (props.groupName) return 'var(--moh-group)'
  if (props.visibility === 'public') return 'var(--moh-text-muted)'
  // Membership audience stays orange even when an organization remaps the viewer theme.
  if (props.visibility === 'premiumOnly') return PRIMARY_PREMIUM_ORANGE[500]
  return postActionVisibilityColor(props.visibility)
})
</script>
