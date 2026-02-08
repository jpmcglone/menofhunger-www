<template>
  <div class="space-y-2">
    <div v-if="$slots.label">
      <slot name="label" />
    </div>

    <div class="relative">
      <span
        v-if="showAtPrefix"
        class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm"
        :class="atPrefixClass"
      >
        @
      </span>
      <InputText
        :model-value="modelValue"
        class="w-full"
        :class="showAtPrefix ? '!pl-10' : ''"
        :placeholder="placeholder"
        autocomplete="off"
        :disabled="disabled"
        @update:model-value="(v) => emit('update:modelValue', String(v ?? ''))"
      />
      <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        <AppLogoLoader v-if="status === 'checking'" :size="20" class="shrink-0" />
        <Icon v-else-if="status === 'available' || status === 'same'" name="tabler:check" class="text-green-600" aria-hidden="true" />
        <Icon v-else-if="status === 'taken' || status === 'invalid'" name="tabler:x" class="text-red-600" aria-hidden="true" />
      </div>
    </div>

    <div v-if="helperText" class="text-sm" :class="helperToneClass">
      {{ helperText }}
    </div>
  </div>
</template>

<script setup lang="ts">
export type UsernameFieldStatus = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'

const props = defineProps<{
  modelValue: string
  status: UsernameFieldStatus
  helperText?: string | null
  disabled?: boolean
  placeholder?: string
  showAtPrefix?: boolean
  tone?: 'default' | 'moh'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const disabled = computed(() => Boolean(props.disabled))
const placeholder = computed(() => props.placeholder ?? 'your_handle')
const showAtPrefix = computed(() => props.showAtPrefix !== false)
const tone = computed(() => props.tone ?? 'default')

const atPrefixClass = computed(() => {
  return tone.value === 'moh' ? 'moh-text-muted' : 'text-gray-500 dark:text-gray-400'
})

const helperToneClass = computed(() => {
  if (props.status === 'available' || props.status === 'same') return 'text-green-700 dark:text-green-300'
  if (props.status === 'taken' || props.status === 'invalid') return 'text-red-700 dark:text-red-300'
  return tone.value === 'moh' ? 'moh-text-muted' : 'text-gray-600 dark:text-gray-300'
})
</script>

