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
  />
</template>

<script setup lang="ts">
const { _visible, _options, _settle } = useAppConfirm()
</script>
