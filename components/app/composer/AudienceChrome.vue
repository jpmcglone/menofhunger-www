<template>
  <div v-if="!replyTo" class="flex min-w-0 flex-wrap items-center gap-2" :class="(!inlineAudience || checkinPrompt) && 'ml-auto'">
    <AppComposerDestinationPicker
      v-if="canChooseGroup"
      :visibility="visibility"
      :allowed="allowed"
      :is-premium="isPremium"
      :groups="groups"
      :model-value="selectedGroupId"
      :loading="loading"
      :error="error"
      :shows-chat="showsChat"
      @select-chat="selectChat"
      @select-visibility="selectVisibility"
      @update:model-value="selectGroup"
      @open="onOpen"
    />
    <AppComposerVisibilityPicker
      v-else-if="showVisibilityPicker"
      :model-value="visibility"
      :allowed="allowed"
      :viewer-is-verified="viewerIsVerified"
      :is-premium="isPremium"
      :shows-chat="showsChat"
      @update:model-value="$emit('update:visibility', $event)"
      @select-chat="selectChat"
    />
    <span
      v-else-if="!canChooseGroup || !effectiveGroupId"
      v-tooltip.bottom="scopeTagTooltip"
      class="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border moh-border px-3 cursor-default"
      :aria-label="`Post audience: ${scopeTagLabel}`"
    >
      <AppComposerAudienceLabel
        :visibility="effectiveVisibility"
        :group-name="showGroupScopeIcon ? scopeTagLabel : undefined"
      />
    </span>
    <span v-if="effectiveGroupId && mode !== 'edit'" class="text-xs moh-text-muted">{{ selectedGroupReadLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'
import type { TinyTooltipConfig } from '~/utils/tiny-tooltip'

defineProps<{
  replyTo?: unknown
  inlineAudience?: boolean
  checkinPrompt?: string
  canChooseGroup: boolean
  visibility: PostVisibility
  allowed: PostVisibility[]
  isPremium: boolean
  groups: readonly { id: string; name: string; avatarImageUrl?: string | null; joinPolicy?: string }[]
  selectedGroupId: string | null
  loading: boolean
  error: string | null | undefined
  showsChat: boolean
  showVisibilityPicker: boolean
  viewerIsVerified: boolean
  effectiveGroupId: string | null
  scopeTagTooltip: TinyTooltipConfig
  scopeTagLabel: string
  effectiveVisibility: PostVisibility
  showGroupScopeIcon: boolean
  mode: 'create' | 'edit'
  selectedGroupReadLabel: string
  selectChat: () => void
  selectVisibility: (value: PostVisibility) => void
  selectGroup: (id: string | null) => void
  onOpen: () => void
}>()

defineEmits<{
  (e: 'update:visibility', value: PostVisibility): void
}>()
</script>
