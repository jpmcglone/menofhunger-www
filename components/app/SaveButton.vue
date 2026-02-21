<template>
  <Button
    :label="label"
    :severity="severity"
    :loading="loading"
    :disabled="loading || disabled"
    v-bind="$attrs"
  >
    <template #icon>
      <Icon name="tabler:check" aria-hidden="true" />
    </template>
  </Button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    loading?: boolean
    disabled?: boolean
    severity?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  }>(),
  {
    label: 'Save',
    loading: false,
    disabled: false,
    severity: 'primary',
  },
)
</script>
