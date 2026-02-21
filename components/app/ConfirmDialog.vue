<template>
  <Dialog
    v-model:visible="open"
    modal
    :header="header"
    :style="{ width: '26rem' }"
    :draggable="false"
    @hide="emit('cancel')"
  >
    <p class="text-sm text-gray-700 dark:text-gray-300">
      <slot>{{ message }}</slot>
    </p>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="onCancel" />
      <Button
        :label="confirmLabel"
        :severity="confirmSeverity"
        @click="onConfirm"
      >
        <template v-if="confirmIcon" #icon>
          <Icon :name="confirmIcon" aria-hidden="true" />
        </template>
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean
    header: string
    message?: string
    confirmLabel?: string
    confirmSeverity?: 'danger' | 'primary' | 'secondary' | 'warning' | 'info' | 'success'
    confirmIcon?: string
  }>(),
  {
    confirmLabel: 'Confirm',
    confirmSeverity: 'danger',
  },
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
  cancel: []
}>()

const open = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

function onConfirm() {
  open.value = false
  emit('confirm')
}

function onCancel() {
  open.value = false
  emit('cancel')
}
</script>
