<template><div /></template>

<script setup lang="ts">
definePageMeta({ layout: 'app', title: 'Group', hideTopBar: true })
const route = useRoute()
await navigateTo({ path: `/g/${encodeURIComponent(String(route.params.slug ?? ''))}`, query: { dialog: 'pending' } }, { replace: true })
</script>
