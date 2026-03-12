export function useArticleBoost(articleId: Ref<string>, initialBoosted: Ref<boolean>, initialCount: Ref<number>) {
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()

  const boosted = ref(initialBoosted.value)
  const count = ref(initialCount.value)
  let lastIntent: 'boost' | 'unboost' | null = null

  watch(initialBoosted, (v) => { boosted.value = v })
  watch(initialCount, (v) => { count.value = v })

  async function toggle() {
    const next = !boosted.value
    const intent = next ? 'boost' : 'unboost'
    lastIntent = intent

    boosted.value = next
    count.value = Math.max(0, count.value + (next ? 1 : -1))

    try {
      const id = articleId.value
      if (next) {
        await apiFetchData(`/articles/${id}/boost`, { method: 'POST' })
      } else {
        await apiFetchData(`/articles/${id}/boost`, { method: 'DELETE' })
      }
    } catch (e: any) {
      if (lastIntent !== intent) return
      boosted.value = !next
      count.value = Math.max(0, count.value + (next ? -1 : 1))
      toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Something went wrong.', tone: 'error' })
    }
  }

  return { boosted, count, toggle }
}
