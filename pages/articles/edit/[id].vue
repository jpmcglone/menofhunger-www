<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center py-20">
      <Icon name="tabler:loader-2" class="animate-spin text-gray-400 text-2xl" />
    </div>
    <div v-else-if="error" class="px-4 py-20 text-center text-sm text-red-500">
      Article not found.
    </div>
    <AppArticleEditorPage v-else-if="article" :article="article" />
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

definePageMeta({ layout: 'app', title: 'Edit Article', hideTopBar: true, middleware: 'premium', ssr: false })

usePageSeo({ title: 'Edit Article', noindex: true })

const route = useRoute()
const id = computed(() => route.params.id as string)
const { apiFetchData } = useApiClient()

const { data: articleData, pending, error } = useAsyncData<Article>(
  `article-edit-${id.value}`,
  () => apiFetchData<Article>(`/articles/${id.value}`),
)
const article = computed<Article | null>(() => articleData.value ?? null)
</script>
