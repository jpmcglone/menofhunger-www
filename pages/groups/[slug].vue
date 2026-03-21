<script setup lang="ts">
const route = useRoute()
const slug = String(route.params.slug ?? '').trim()
if (!slug) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}
await navigateTo(`/g/${encodeURIComponent(slug)}`, { replace: true })
definePageMeta({ layout: 'app' })
</script>

<template>
  <div class="flex justify-center py-16">
    <AppLogoLoader />
  </div>
</template>
