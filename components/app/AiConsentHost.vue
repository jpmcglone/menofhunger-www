<template><div :id="id" data-marv-permission-host :data-fallback="fallback || undefined" /></template>

<script setup lang="ts">
withDefaults(defineProps<{ fallback?: boolean }>(), { fallback: false })
const id = useId()
const { target, finish } = useAiConsent()
onBeforeUnmount(() => { if (target.value === id) finish(false) })
</script>
