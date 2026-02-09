import { promptUnsavedDraft } from '~/composables/useUnsavedDraftPrompt'
import { useUnsavedDraftGuard } from '~/composables/useUnsavedDraftGuard'
import { useApiClient } from '~/composables/useApiClient'
import { useAppToast } from '~/composables/useAppToast'
import type { UnsavedDraftSnapshot } from '~/composables/useUnsavedDraftGuard'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const router = useRouter()
  const toast = useAppToast()
  const { apiFetchData } = useApiClient()
  const { activeUnsavedEntry } = useUnsavedDraftGuard()

  let prompting = false

  async function saveSnapshot(snapshot: UnsavedDraftSnapshot) {
    const body = String(snapshot?.body ?? '')
    const media = Array.isArray(snapshot?.media) ? snapshot.media : []
    const draftId = (snapshot?.draftId ?? null) as string | null

    if (draftId) {
      return await apiFetchData(`/drafts/${encodeURIComponent(draftId)}`, {
        method: 'PATCH',
        body: { body, media },
      })
    }
    return await apiFetchData('/drafts', {
      method: 'POST',
      body: { body, media },
    })
  }

  router.beforeEach(async (to, from) => {
    // Ignore same-route navigations.
    if (to.fullPath === from.fullPath) return true
    if (prompting) return false

    const entry = activeUnsavedEntry()
    if (!entry) return true

    prompting = true
    try {
      const choice = await promptUnsavedDraft(entry.snapshot())
      if (choice === 'cancel') return false
      if (choice === 'discard') {
        entry.clear()
        return true
      }

      // save
      try {
        await saveSnapshot(entry.snapshot())
        entry.clear()
        toast.push({ title: 'Draft saved', tone: 'success', durationMs: 1600 })
        return true
      } catch (e: unknown) {
        toast.push({ title: 'Failed to save draft', message: 'Please try again.', tone: 'error', durationMs: 2600 })
        return false
      }
    } finally {
      prompting = false
    }
  })

  // Ensure modal is mounted early (layout also mounts it, but keep it safe in case of layout swaps).
  nuxtApp.hook('app:mounted', () => {
    // no-op; hook ensures plugin runs after app mount.
  })
})

