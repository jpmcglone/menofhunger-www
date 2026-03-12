<template>
  <div>
    <div v-if="creating" class="flex min-h-screen items-center justify-center">
      <Icon name="tabler:loader-2" class="animate-spin text-2xl text-gray-400" aria-hidden="true" />
    </div>
    <div v-else-if="createError" class="flex min-h-screen items-center justify-center px-4 text-center text-sm text-red-500">
      {{ createError }}
    </div>
    <AppArticleEditorPage v-else-if="article" :article="article" />
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

definePageMeta({ layout: 'app', title: 'New Article', hideTopBar: true, ssr: false })

const { isPremium, ensureLoaded } = useAuth()
const { apiFetchData } = useApiClient()

const creating = ref(true)
const createError = ref<string | null>(null)
const article = ref<Article | null>(null)

onMounted(async () => {
  await ensureLoaded()
  if (!isPremium.value) {
    await navigateTo('/articles', { replace: true })
    return
  }
  try {
    const draft = await apiFetchData<Article>('/articles', { method: 'POST', body: { title: '' } })
    // Navigate to the edit page directly — no double-mount, no wasted re-fetch
    await navigateTo(`/articles/edit/${draft.id}`, { replace: true })
  } catch (e: any) {
    createError.value = e?.data?.meta?.errors?.[0]?.message ?? 'Could not create article. Please try again.'
    creating.value = false
  }
})
</script>
