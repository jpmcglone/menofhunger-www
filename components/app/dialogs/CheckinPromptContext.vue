<template>
  <div class="min-w-0 space-y-2.5 border-l-[3px] border-[var(--moh-checkin)] pl-4">
    <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--moh-checkin)]">
      <AppIconGlyph name="checkin" :size="16" />
      <span>{{ label }}</span>
    </div>
    <component :is="headingTag" :id="headingId" class="moh-serif font-normal leading-[1.45] break-words moh-text" :class="compact ? 'text-xl' : 'text-2xl'">{{ prompt }}</component>
    <p v-if="metadata" class="text-xs leading-relaxed moh-text-muted">{{ metadata }}</p>
  </div>
</template>

<script setup lang="ts">
// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=402-173
withDefaults(defineProps<{
  prompt: string
  label?: string
  metadata?: string
  compact?: boolean
  headingTag?: 'h1' | 'h2' | 'h3' | 'p'
  headingId?: string
}>(), { label: 'Check-in prompt · Today', metadata: '', compact: false, headingTag: 'p', headingId: undefined })
</script>
