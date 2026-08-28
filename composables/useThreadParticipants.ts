import type { Ref } from 'vue'
import type { GetThreadParticipantsData } from '~/types/api'
import { excludeMarvUsername } from '~/utils/exclude-marv-username'

export function useThreadParticipants(options: {
  post: Ref<{ id: string; visibility?: string } | null>
  isOnlyMe: Ref<boolean>
  currentUsername: Ref<string | null | undefined>
}) {
  const { post, isOnlyMe, currentUsername } = options
  const { apiFetchData } = useApiClient()
  const { marvUsername } = useMarv()

  const threadParticipants = ref<GetThreadParticipantsData>([])

  async function fetchThreadParticipants() {
    if (!post.value?.id || isOnlyMe.value) return
    try {
      const res = await apiFetchData<GetThreadParticipantsData>(
        `/posts/${encodeURIComponent(post.value.id)}/thread-participants`,
        { method: 'GET' }
      )
      threadParticipants.value = Array.isArray(res) ? res : []
    } catch {
      threadParticipants.value = []
    }
  }

  const participantsWithoutMarv = computed(() =>
    excludeMarvUsername(threadParticipants.value, marvUsername.value),
  )

  const replyingToDisplay = computed(() => {
    const myUsername = currentUsername.value
    const people = participantsWithoutMarv.value
    if (!myUsername) return people
    return people.filter((p) => p.username?.toLowerCase() !== myUsername.toLowerCase())
  })

  watch(
    () => [post.value?.id, isOnlyMe.value] as const,
    ([id, onlyMe]) => {
      if (id && !onlyMe) {
        void fetchThreadParticipants()
      } else {
        threadParticipants.value = []
      }
    },
    { immediate: true }
  )

  return {
    threadParticipants: participantsWithoutMarv,
    replyingToDisplay,
    fetchThreadParticipants,
  }
}
