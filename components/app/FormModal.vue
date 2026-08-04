<template>
  <Dialog
    :visible="modelValue"
    modal
    :draggable="false"
    :closable="false"
    :style="style ?? { width: 'min(46rem, 96vw)' }"
    @update:visible="(v: boolean) => $emit('update:modelValue', Boolean(v))"
  >
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <Button
          text
          severity="secondary"
          aria-label="Close"
          :disabled="saving"
          @click="$emit('update:modelValue', false)"
        >
          <template #icon>
            <Icon name="tabler:x" aria-hidden="true" />
          </template>
        </Button>
        <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {{ title }}
        </div>
        <Button
          v-if="showSubmit"
          :label="submitLabel"
          severity="secondary"
          :loading="saving"
          :disabled="saving || !canSubmit"
          @click="$emit('submit')"
        />
      </div>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    showSubmit?: boolean
    submitLabel?: string
    saving?: boolean
    canSubmit?: boolean
    style?: Record<string, string> | string
  }>(),
  { showSubmit: true, submitLabel: 'Save', saving: false, canSubmit: true },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submit'): void
}>()

const open = computed(() => Boolean(props.modelValue))

function close() {
  // Mirrors the header X, which is disabled mid-save.
  if (props.saving) return
  emit('update:modelValue', false)
}

// Escape, the Android/browser Back button, and route changes all dismiss this.
// PrimeVue's own Escape handling is off here because `closable` is false.
useOverlayDismiss(open, close)
</script>
