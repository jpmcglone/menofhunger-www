<template>
  <AppConfirmDialog
    :visible="Boolean(pendingUrl)"
    header="Opens outside Men of Hunger"
    :message="pendingUrl ? externalLinkHost(pendingUrl) : ''"
    cancel-label="Cancel"
    confirm-label="Open site"
    confirm-severity="primary"
    @update:visible="!$event && cancel()"
    @confirm="confirm"
    @cancel="cancel"
  />
</template>

<script setup lang="ts">
import { externalLinkHost } from '~/composables/useExternalLinkConfirm'

const { pendingUrl, cancel, confirm } = useExternalLinkConfirm()
</script>
