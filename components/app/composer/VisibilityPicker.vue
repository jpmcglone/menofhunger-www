<template>
  <button type="button" class="moh-focus moh-surface-hover inline-flex min-h-11 items-center gap-2 rounded-full border moh-border px-3" :aria-label="`Select post visibility: ${label}`" aria-haspopup="dialog" :aria-expanded="open" :disabled="!viewerIsVerified" @click="open = true">
    <AppComposerAudienceLabel :visibility="modelValue" />
    <Icon v-if="viewerIsVerified" name="tabler:chevron-down" class="text-base moh-text-muted" aria-hidden="true" />
  </button>
  <AppComposerSelectionDialog v-model="open" title="Post visibility" description="Who can see your post in the feed.">
    <AppComposerSelectionRow v-for="option in options" :key="option.value" :label="option.label" :description="option.description" :icon="option.icon" :color="option.color" :selected="modelValue === option.value" :locked="option.value === 'premiumOnly' && !isPremium" @select="select(option.value)" />
    <div v-if="showsChat" class="mt-3 border-t moh-border pt-3">
      <AppComposerSelectionRow label="Chat" description="Send as a message" icon="tabler:message-circle" @select="selectChat" />
    </div>
  </AppComposerSelectionDialog>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'
const props = defineProps<{ modelValue: PostVisibility; allowed: PostVisibility[]; viewerIsVerified: boolean; isPremium: boolean; showsChat?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: PostVisibility]; 'select-chat': [] }>()
const open = ref(false)
const choices: { value: PostVisibility; label: string; description: string; icon: string; color?: string }[] = [
  { value: 'public', label: 'Public', description: 'Everyone can see this post', icon: 'tabler:world' },
  { value: 'verifiedOnly', label: 'Verified', description: 'Verified members only', icon: 'tabler:circle-check-filled', color: 'var(--moh-verified)' },
  { value: 'premiumOnly', label: 'Premium', description: 'Premium members only', icon: 'tabler:rosette-discount-check-filled', color: 'var(--moh-premium)' },
  { value: 'onlyMe', label: 'Only me', description: 'Only visible to you', icon: 'tabler:lock', color: 'var(--moh-onlyme)' },
]
const options = computed(() => choices.filter(option => props.allowed.includes(option.value)))
const label = computed(() => choices.find(option => option.value === props.modelValue)?.label ?? 'Public')
function select(value: PostVisibility) {
  if (!props.allowed.includes(value) || (value === 'premiumOnly' && !props.isPremium)) return
  emit('update:modelValue', value)
  open.value = false
}
function selectChat() { open.value = false; emit('select-chat') }
</script>
