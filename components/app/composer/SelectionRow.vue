<template>
  <button type="button" class="moh-focus flex min-h-[72px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:opacity-50" :class="selected ? 'bg-[var(--moh-surface-3)]' : 'moh-surface-hover'" :disabled="locked" :aria-pressed="selected" @click="$emit('select')">
    <slot name="icon"><Icon v-if="icon" :name="icon" class="shrink-0 text-[22px]" :style="color ? { color } : undefined" aria-hidden="true" /></slot>
    <span class="min-w-0 flex-1"><span class="block text-[15px] font-semibold moh-text">{{ label }}</span><span class="mt-1 block text-[13px] moh-text-muted">{{ description }}</span></span>
    <Icon v-if="locked" name="tabler:lock" class="shrink-0 text-lg moh-text-muted" aria-hidden="true" />
    <Icon v-else-if="selected" name="tabler:check" class="shrink-0 text-[22px] moh-text" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
defineProps<{ label: string; description: string; icon?: string; color?: string; selected?: boolean; locked?: boolean }>()
defineEmits<{ select: [] }>()
</script>
