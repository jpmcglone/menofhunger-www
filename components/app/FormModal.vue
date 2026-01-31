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
          icon="pi pi-times"
          text
          severity="secondary"
          aria-label="Close"
          :disabled="saving"
          @click="$emit('update:modelValue', false)"
        />
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
withDefaults(
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

defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submit'): void
}>()
</script>
