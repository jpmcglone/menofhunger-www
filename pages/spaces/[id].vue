<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x py-8 moh-meta">
      <p>Redirecting…</p>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Space',
  middleware: ['verified'],
  ssr: false,
})

const route = useRoute()
const id = computed(() => (route.params.id as string)?.trim() ?? '')
const { apiFetchData } = useApiClient()

onMounted(async () => {
  if (!id.value) {
    navigateTo('/spaces', { replace: true })
    return
  }
  try {
    const space = await apiFetchData<{ owner?: { username?: string } }>(`/spaces/${encodeURIComponent(id.value)}`, { method: 'GET' })
    if (space?.owner?.username) {
      navigateTo(`/s/${encodeURIComponent(space.owner.username)}`, { replace: true })
    } else {
      navigateTo('/spaces', { replace: true })
    }
  } catch {
    navigateTo('/spaces', { replace: true })
  }
})
</script>
