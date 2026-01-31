<template>
  <div class="space-y-2">
    <label v-if="label || $slots.label" :class="['text-sm font-medium', labelClass]">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ml-0.5 text-red-600 dark:text-red-400">*</span>
      <span v-if="optional" :class="['ml-1 font-normal', optionalClass]">(Optional)</span>
    </label>

    <div>
      <slot />
    </div>

    <div v-if="$slots.helper" :class="['text-xs flex justify-end', helperMutedClass]">
      <slot name="helper" />
    </div>

    <div v-else-if="helper" :class="['text-sm', helperToneClass]">
      {{ helper }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Label text (or use #label slot) */
    label?: string
    /** Show required asterisk */
    required?: boolean
    /** Show "(Optional)" suffix */
    optional?: boolean
    /** Helper text (or use #helper slot for custom content like char count) */
    helper?: string | null
    /** Helper tone: default, success (green), or error (red) */
    helperTone?: 'default' | 'success' | 'error'
    /** Tone: default (gray) or moh (theme-aware for overlays) */
    tone?: 'default' | 'moh'
  }>(),
  { tone: 'default' },
)

const labelClass = computed(() =>
  props.tone === 'moh' ? 'moh-text' : 'text-gray-700 dark:text-gray-200',
)
const optionalClass = computed(() =>
  props.tone === 'moh' ? 'moh-text-muted' : 'text-gray-500 dark:text-gray-400',
)
const helperMutedClass = computed(() =>
  props.tone === 'moh' ? 'moh-text-muted' : 'text-gray-500 dark:text-gray-400',
)
const helperToneClass = computed(() => {
  if (props.helperTone === 'error') return 'text-red-700 dark:text-red-300'
  if (props.helperTone === 'success') return 'text-green-700 dark:text-green-300'
  return props.tone === 'moh' ? 'moh-text-muted' : 'text-gray-600 dark:text-gray-300'
})
</script>
