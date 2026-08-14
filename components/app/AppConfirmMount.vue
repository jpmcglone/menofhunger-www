<template>
  <AppConfirmDialog
    :visible="_visible"
    :header="_options?.header ?? ''"
    :message="_options?.message"
    :cancel-label="_options?.cancelLabel"
    :show-cancel="_options?.showCancel ?? true"
    :confirm-label="_options?.confirmLabel"
    :confirm-severity="_options?.confirmSeverity"
    :confirm-icon="_options?.confirmIcon"
    @update:visible="!$event && _settle(false)"
    @confirm="_settle(true)"
    @cancel="_settle(false)"
  >
    <template v-if="_options?.discardLabel" #extra-actions>
      <button
        type="button"
        class="moh-tap moh-focus rounded-lg px-4 py-2 text-sm font-medium moh-text-muted hover:moh-text transition-colors"
        @click="_settle('discard')"
      >
        {{ _options.discardLabel }}
      </button>
    </template>
  </AppConfirmDialog>
</template>

<script setup lang="ts">
const { _visible, _options, _settle } = useAppConfirm()
</script>
