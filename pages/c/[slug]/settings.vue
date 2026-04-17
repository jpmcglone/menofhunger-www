<template>
  <AppPageContent bottom="standard">
    <div class="flex justify-center py-16">
      <AppLogoLoader />
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
/**
 * Legacy /c/:slug/settings entry point. Crew settings now live in the
 * "Edit Crew" dialog opened from the crew page header (mirroring the Edit
 * Profile / Edit Group dialogs). Anyone landing here from an old link is
 * bounced back to the crew page.
 */
definePageMeta({
  layout: 'app',
  title: 'Crew settings',
  hideTopBar: true,
})

usePageSeo({ noindex: true })

const route = useRoute()

onMounted(() => {
  const slug = String(route.params.slug || '').toLowerCase()
  void navigateTo(slug ? `/c/${encodeURIComponent(slug)}` : '/crew', { replace: true })
})
</script>
