<template>
  <Dialog v-model:visible="visible" modal :dismissable-mask="!busy" :closable="!busy" :close-on-escape="!busy" :header="title" :style="{ width: '488px', maxWidth: 'calc(100vw - 24px)' }" :pt="{ root: { class: 'moh-selection-dialog' }, content: { class: '!px-3 !pb-4' } }">
    <p class="moh-meta px-3 pb-5">{{ description }}</p>
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </Dialog>
</template>

<script setup lang="ts">
defineProps<{ title: string; description: string; busy?: boolean }>()
const visible = defineModel<boolean>({ required: true })
</script>

<style>
.moh-selection-dialog { border-radius: 24px !important; background: var(--moh-surface-2) !important; }
.moh-selection-dialog .p-dialog-header { padding: 24px 24px 8px; }
.moh-selection-dialog .p-dialog-title { font-size: 20px; font-weight: 600; }
.moh-selection-dialog .p-dialog-header-actions button { min-width: 44px; min-height: 44px; }
</style>
