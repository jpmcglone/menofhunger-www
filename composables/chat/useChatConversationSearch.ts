import type { MessageConversation } from '~/types/api'

/** Debounced conversation search against the API. */
export function useChatConversationSearch() {
  const { apiFetchData } = useApiClient()

  const conversationSearchResults = ref<MessageConversation[] | null>(null)
  const conversationSearchLoading = ref(false)
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function handleConversationSearchQuery(q: string) {
    if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null }
    const trimmed = q.trim()
    if (!trimmed) {
      conversationSearchResults.value = null
      conversationSearchLoading.value = false
      return
    }
    conversationSearchLoading.value = true
    conversationSearchResults.value = null
    searchDebounceTimer = setTimeout(async () => {
      searchDebounceTimer = null
      try {
        const result = await apiFetchData<MessageConversation[]>(
          `/messages/conversations/search?q=${encodeURIComponent(trimmed)}`,
        )
        conversationSearchResults.value = Array.isArray(result) ? result : []
      } catch {
        conversationSearchResults.value = []
      } finally {
        conversationSearchLoading.value = false
      }
    }, 300)
  }

  function teardown() {
    if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null }
  }

  return { conversationSearchResults, conversationSearchLoading, handleConversationSearchQuery, teardown }
}
