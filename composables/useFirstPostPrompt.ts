import { needsOnboarding } from '~/utils/onboarding'
import { parseWelcomeProgress, welcomeProgressKey } from '~/utils/welcome-progress'

export const firstPostPromptKey = (userId: string) => `moh.first-post-prompt.v1.${userId}`

/** Starts the post in the member's voice; the trailing space leaves the cursor ready to finish it. */
export function firstPostStarter(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? ''
  return first ? `I’m ${first}, and I’m here because ` : 'I’m here because '
}

/**
 * One-time invitation to write a first post, offered the first time this device sees the
 * member verified (verification unlocks posting) with nothing posted yet.
 */
export function useFirstPostPrompt() {
  const { user, isVerified } = useAuth()
  const ready = ref(false)
  const seen = ref(true)

  function restore() {
    const id = user.value?.id
    if (!id) {
      seen.value = true
      return
    }
    try {
      seen.value = localStorage.getItem(firstPostPromptKey(id)) === '1'
        || parseWelcomeProgress(localStorage.getItem(welcomeProgressKey(id))).posted
    } catch {
      seen.value = false
    }
  }

  function markSeen() {
    seen.value = true
    const id = user.value?.id
    if (!id) return
    try { localStorage.setItem(firstPostPromptKey(id), '1') } catch { /* Stays dismissed for this session. */ }
  }

  const eligible = computed(() => {
    const u = user.value
    if (!ready.value || seen.value || !u?.id || !isVerified.value || u.isOrganization) return false
    return u.postCount === 0 && !needsOnboarding(u)
  })

  const starter = computed(() => firstPostStarter(user.value?.name))

  onMounted(() => {
    restore()
    ready.value = true
  })
  watch(() => user.value?.id, () => { if (ready.value) restore() })

  return { eligible, starter, markSeen }
}
