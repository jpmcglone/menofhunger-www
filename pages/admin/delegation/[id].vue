<template><AdminDelegationWorkspace :job-id="String(route.params.id)" /></template>
<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['admin'], hideTopBar: true })
const route = useRoute()
</script>
