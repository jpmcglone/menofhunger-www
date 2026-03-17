<template>
  <div v-if="articles.length > 0">
    <div class="border-t border-gray-200 dark:border-zinc-800 px-4 pt-6 pb-2">
      <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
        More on {{ activeTagLabel }}
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
import type { Article, ArticleTag } from '~/types/api'

const props = defineProps<{
  articleId: string
  tags: ArticleTag[]
}>()

const { apiFetchData } = useApiClient()

const articles = ref<Article[]>([])
const activeTagLabel = ref<string>('')

async function load() {
  const tagCandidates = (props.tags ?? []).slice(0, 5)
  if (!tagCandidates.length) {
    articles.value = []
    activeTagLabel.value = ''
    return
  }

  for (const candidate of tagCandidates) {
    const rows = await apiFetchData<Article[]>('/articles', {
      query: {
        limit: 4,
        includeRestricted: true,
        tag: candidate.tag,
      },
    })
    const filtered = (rows ?? [])
      .filter((a) => a.id !== props.articleId)
      .slice(0, 3)
    if (filtered.length > 0) {
      articles.value = filtered
      activeTagLabel.value = candidate.label || candidate.tag
      return
    }
  }

  articles.value = []
  activeTagLabel.value = ''
}

watch(
  () => [props.articleId, props.tags.map((t) => `${t.tag}:${t.label}`).join('|')],
  () => {
    void load()
  },
  { immediate: true },
)
</script>
