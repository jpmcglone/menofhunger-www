<template>
  <div v-if="articles.length > 0">
    <div class="border-t border-gray-200 dark:border-zinc-800 px-4 pt-6 pb-2">
      <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
        More from this author
      </p>
    </div>
    <AppArticleListCard
      v-for="article in articles"
      :key="article.id"
      :article="article"
    />
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

const props = defineProps<{
  authorUsername: string
  currentArticleId: string
}>()

const { apiFetchData } = useApiClient()
const articles = ref<Article[]>([])

onMounted(async () => {
  try {
    const res = await apiFetchData<Article[]>(`/articles`, {
      query: { authorUsername: props.authorUsername, limit: 4, includeRestricted: true },
    })
    articles.value = (Array.isArray(res) ? res : []).filter((a) => a.id !== props.currentArticleId).slice(0, 3)
  } catch {
    // best effort
  }
})
</script>
