import type { ApiEnvelope, MessageBlockListItem } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import type { MohApiFetchOptions } from '~/composables/useApiClient'

type ApiFetch = <T>(path: string, options?: MohApiFetchOptions) => Promise<ApiEnvelope<T>>

export function useChatBlocks(params: {
  apiFetch: ApiFetch
  clearSelection: (opts?: { replace?: boolean; preserveDraft?: boolean }) => Promise<void>
  fetchConversations: (tab: 'primary' | 'requests', opts?: { cursor?: string | null; forceRefresh?: boolean }) => Promise<void>
}) {
  const blocksDialogVisible = ref(false)
  const blocks = ref<MessageBlockListItem[]>([])
  const blocksLoading = ref(false)
  const blocksError = ref<string | null>(null)

  async function fetchBlocks() {
    blocksLoading.value = true
    blocksError.value = null
    try {
      const res = await params.apiFetch<MessageBlockListItem[]>('/messages/blocks')
      blocks.value = res.data ?? []
    } catch (e: unknown) {
      blocksError.value = getApiErrorMessage(e) || 'Failed to load blocked users.'
    } finally {
      blocksLoading.value = false
    }
  }

  async function blockUser(userId: string) {
    blocksError.value = null
    try {
      await params.apiFetch('/messages/blocks', { method: 'POST', body: { user_id: userId } })
      await fetchBlocks()
      await params.clearSelection({ replace: true })
      await params.fetchConversations('primary', { forceRefresh: true })
      await params.fetchConversations('requests', { forceRefresh: true })
    } catch (e: unknown) {
      blocksError.value = getApiErrorMessage(e) || 'Failed to block user.'
    }
  }

  async function unblockUser(userId: string) {
    blocksError.value = null
    try {
      await params.apiFetch(`/messages/blocks/${userId}`, { method: 'DELETE' })
      await fetchBlocks()
      await params.fetchConversations('primary', { forceRefresh: true })
      await params.fetchConversations('requests', { forceRefresh: true })
    } catch (e: unknown) {
      blocksError.value = getApiErrorMessage(e) || 'Failed to unblock user.'
    }
  }

  return {
    blocksDialogVisible,
    blocks,
    blocksLoading,
    blocksError,
    fetchBlocks,
    blockUser,
    unblockUser,
  }
}

